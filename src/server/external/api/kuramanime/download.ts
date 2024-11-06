import fs from 'fs/promises'
import path from 'path'
import ky from 'ky'
import * as v from 'valibot'
import { env } from '~/env'
import * as kyInstances from '~s/ky'
import { anime, animeMetadata } from '~s/db/schema'
import { videosDirPath, animeVideoRealDirPath } from '~s/utils/path'
import { logger } from '~s/utils/logger'
import { EpisodeNotFoundError, SilentError } from '~s/error'
import { metadataQueue, downloadQueue } from '~s/external/queue'
import {
  downloadProgress,
  downloadProgressController,
  downloadProgressSnapshot,
} from '~s/external/download/progress'
import { fetchText } from '~s/utils/fetch'
import { formatBytes } from '~/shared/utils/byte'
import { parseFromJsObjectString } from '~/shared/utils/json'
import { toSearchParamString } from '~/shared/utils/url'

const kuramanimeInitProcessSchema = v.object({
  env: v.object({
    MIX_JS_ROUTE_PARAM_ATTR_KEY: v.string(),
    MIX_JS_ROUTE_PARAM_ATTR: v.string(),
  }),
})

const kuramanimeProcessSchema = v.object({
  env: v.object({
    MIX_AUTH_ROUTE_PARAM: v.string(),
    MIX_PAGE_TOKEN_KEY: v.string(),
    MIX_STREAM_SERVER_KEY: v.string(),
  }),
})

let kMIX_PAGE_TOKEN_VALUE: string | null
let kProcess: v.InferInput<typeof kuramanimeProcessSchema> | null
let kInitProcess: v.InferInput<typeof kuramanimeInitProcessSchema> | null

const unsetCredentials = () => {
  kMIX_PAGE_TOKEN_VALUE = null
  kProcess = null
  kInitProcess = null
}

const PREDOWNLOAD_VIDEO_METADATA_THRESHOLD =
  env.PREDOWNLOAD_VIDEO_METADATA_AT_LESS_THAN_MB * 1024 * 1024

export const generateEmitKey = (
  animeData: Pick<typeof anime.$inferSelect, 'title' | 'totalEpisodes'>,
  episodeNumber: number,
) => {
  return animeData.title + (animeData.totalEpisodes === 1 ? '' : `: Episode ${episodeNumber}`)
}

export const downloadEpisode = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title' | 'totalEpisodes'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
  onFinish?: () => void,
): Promise<{ size: string | null } | null> => {
  const emitKey = generateEmitKey(animeData, episodeNumber)
  const emit = (text: string, done = false) => {
    downloadProgress.emit(emitKey, { text, done })
  }

  emit('Menginisialisasi proses unduhan')

  let animeDirPath = await animeVideoRealDirPath(animeData.id)
  let shouldCheck = true
  if (!animeDirPath) {
    animeDirPath = videosDirPath + generateDirSlug(animeData) + path.sep
    shouldCheck = false
  }

  const fileName = episodeNumber.toString().padStart(2, '0')
  const filePath = animeDirPath + fileName + '.mp4'

  if (shouldCheck && (await Bun.file(filePath).exists())) {
    emit('Episode ini telah diunduh', true)

    return null
  }

  const tempFilePath = animeDirPath + fileName + '_.mp4'
  const tempFile = Bun.file(tempFilePath)

  const abortController = new AbortController()
  const { signal } = abortController

  signal.addEventListener('abort', event => {
    if (event.target instanceof AbortSignal && event.target.reason === 'pause') {
      emit('Unduhan dijeda', true)
    } else {
      // defaultnya cancel
      fs.rm(tempFilePath, { force: true })
      fs.rm(filePath, { force: true })

      emit('Unduhan dibatalkan', true)
    }
  })

  downloadProgressController.set(emitKey, abortController)

  const episodeUrl = `anime/${metadata.providerId}/${metadata.providerSlug}/episode/${episodeNumber}`

  const setCredentials = async () => {
    emit('Mengambil token dari Kuramanime')
    ;[[kMIX_PAGE_TOKEN_VALUE, kProcess], kInitProcess] = await Promise.all([
      getKuramanimeProcess(episodeUrl),
      getKuramanimeInitProcess(),
    ])
  }

  const getDownloadUrl = async (): Promise<string> => {
    if (!kMIX_PAGE_TOKEN_VALUE || !kProcess || !kInitProcess) {
      await setCredentials()
    }

    const searchParams = toSearchParamString({
      [kProcess!.env.MIX_PAGE_TOKEN_KEY]: kMIX_PAGE_TOKEN_VALUE!,
      [kProcess!.env.MIX_STREAM_SERVER_KEY]: 'kuramadrive',
      page: 1,
    })

    emit('Mengambil tautan unduh dari Kuramanime')

    const responseHtml = await fetchText(
      `${episodeUrl}?${searchParams}`,
      { signal },
      kyInstances.kuramanime,
    )

    const handleDownloadUrlNotFound = () => {
      // tokennya expired
      if (responseHtml.includes('Terjadi kesalahan saat mengambil tautan unduh')) {
        unsetCredentials()

        return getDownloadUrl()
      }

      // video streaming masih diproses
      if (responseHtml.includes('Streaming sedang diproses')) {
        const index =
          responseHtml.indexOf('updatedAtPlus5Min" value="') + 'updatedAtPlus5Min" value="'.length
        if (index !== -1) {
          const updatedAtPlus5Min = responseHtml.slice(index, responseHtml.indexOf('"', index))

          const updatedAtPlus5MinDate = new Date(updatedAtPlus5Min)
          const now = new Date()

          const diff = updatedAtPlus5MinDate.getTime() - now.getTime()

          emit(`Video sedang diproses. Mulai mengunduh dalam ${diff / 1e3} detik`)

          return new Promise<string>(resolve => {
            setTimeout(() => {
              resolve(getDownloadUrl())
            }, diff)
          })
        }
      }

      emit('Terjadi error yang tidak diketahui. Harap cek log', true)

      logger.error('Download episode: unknown error', {
        localAnime: animeData,
        metadata,
        episodeNumber,
        responseHtml,
      })

      throw new SilentError('unknown error')
    }

    const videoOpenTagIndex = responseHtml.indexOf('<video')
    if (videoOpenTagIndex === -1) {
      return handleDownloadUrlNotFound()
    }

    const videoCloseTagIndex = responseHtml.indexOf('</video>')
    const videoTag = responseHtml.slice(videoOpenTagIndex, videoCloseTagIndex)

    const sourceTags = videoTag.split('<source')

    const sources: string[] = []

    // index pertama isinya tag video, bukan source
    for (let i = 1; i < sourceTags.length; i++) {
      const sourceTag = sourceTags[i]!

      const getAttributeValue = (attributeName: string) => {
        const attributeIndex = sourceTag.indexOf(`${attributeName}="`)
        if (attributeIndex === -1) {
          return null
        }

        const value = sourceTag.slice(attributeIndex + attributeName.length + '="'.length)

        return value.slice(0, value.indexOf('"'))
      }

      const downloadUrl = getAttributeValue('src')
      const size = parseInt(getAttributeValue('size') ?? '')

      if (!downloadUrl || isNaN(size)) {
        continue
      } else if (size === 720) {
        return downloadUrl
      }

      sources[size] = downloadUrl
    }

    for (let i = sources.length; i >= 0; i--) {
      const downloadUrl = sources[i]
      if (downloadUrl) {
        return downloadUrl
      }
    }

    return handleDownloadUrlNotFound()
  }

  const start = (formattedTotalLengthCb?: (formattedTotalLength: string | null) => void) => {
    const handleError = (error: any) => {
      // kalo "error"nya dari `AbortController.abort`, variabel error nilainya sesuai parameternya
      // untuk sekarang parameternya antara undefined (default) atau string
      if (!(error === undefined || typeof error === 'string' || error instanceof DOMException)) {
        emit('Terjadi kesalahan', true)

        throw error
      }
    }

    const downloadVideo = async (url: string, start: number) => {
      const gdriveCredentials = await getGdriveCredentials(url)

      return ky.get(`https://www.googleapis.com/drive/v3/files/${gdriveCredentials.id}?alt=media`, {
        signal,
        headers: {
          Range: `bytes=${start}-`,
          Authorization: `Bearer ${gdriveCredentials.data.access_token}`,
        },
      })
    }

    const metadataLock = new Promise<void>(releaseMetadataLock => {
      let downloadIsStarted = false

      const prepareResponsePromise = new Promise<[string, Response]>(
        (resolvePreparedResponse, reject) => {
          metadataQueue
            .add(
              async () => {
                const url = await getDownloadUrl()
                const preparedResponse = await downloadVideo(url, tempFile.size)

                if (!downloadIsStarted) {
                  emit('Menunggu unduhan sebelumnya selesai')
                }

                resolvePreparedResponse([url, preparedResponse])

                await metadataLock
              },
              { signal },
            )
            .catch(reject)
        },
      ).catch(handleError)

      downloadQueue
        .add(
          async () => {
            downloadIsStarted = true

            const initialLength = tempFile.size
            let receivedLength = initialLength

            emit((initialLength ? 'Lanjut' : 'Mulai') + ' mengunduh')

            const prepared = await prepareResponsePromise
            if (!prepared) {
              return
            }
            const [url, preparedResponse] = prepared

            const totalLength =
              initialLength + Number(preparedResponse.headers?.get('Content-Length'))
            const formattedTotalLength = totalLength ? formatBytes(totalLength) : null

            formattedTotalLengthCb?.(formattedTotalLength)

            await fs.mkdir(animeDirPath, { recursive: true })

            const writer = tempFile.writer({ highWaterMark: 4 * 1024 * 1024 }) // 4 MB

            // https://github.com/oven-sh/bun/issues/5821
            if (initialLength) {
              const existingData = await Bun.readableStreamToBytes(tempFile.stream())

              writer.write(existingData)
              await writer.flush()
            }

            let skip = false
            let isResolved = false

            const startTime = performance.now()
            const emitProgress = (data: Uint8Array) => {
              receivedLength += data.length

              if (skip) {
                return
              }

              skip = true

              const elapsedTime = (performance.now() - startTime) / 1e3 // ms -> s

              if (
                !isResolved &&
                totalLength &&
                totalLength - receivedLength < PREDOWNLOAD_VIDEO_METADATA_THRESHOLD
              ) {
                isResolved = true

                releaseMetadataLock()
              }

              let text = 'Mengunduh: ' + formatBytes(receivedLength)
              const speed = '@' + formatBytes((receivedLength - initialLength) / elapsedTime) + '/s'

              if (totalLength) {
                text +=
                  ' / ' +
                  formattedTotalLength +
                  speed +
                  ' (' +
                  ((receivedLength / totalLength) * 100).toFixed(2) +
                  '%)'
              } else {
                text += speed
              }

              emit(text)
            }

            const setSkipIntervalId = setInterval(() => {
              skip = false
            }, 50)

            if (initialLength) {
              // kalo ini downloadnya adalah lanjutan, pada saat diemit nanti speednya bakal tinggi banget diawal
              // seharusnya engga gitu karena perhitungannya `receivedLength - initialLength`
              // jadi untuk ngakalin biar speednya normal, diawal bakal diemit progress kosong
              // kekurangannya untuk 1/20 detik diawal speednya bakal tulis "0 B/s"
              emitProgress(new Uint8Array())
            }

            let firstTime = true
            while (true) {
              const request = firstTime
                ? preparedResponse
                : await downloadVideo(url, receivedLength)

              firstTime = false

              const reader = request.body?.getReader()
              if (!reader) {
                throw new Error('no reader')
              }

              const signalAbortHandler = () => {
                reader.cancel()
              }

              signal.addEventListener('abort', signalAbortHandler)

              let lastCheckedReceivedLength = receivedLength
              const checkIntervalId = setInterval(() => {
                if (lastCheckedReceivedLength === receivedLength) {
                  reader.cancel()
                } else {
                  lastCheckedReceivedLength = receivedLength
                }
              }, 5_000)

              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  break
                }

                writer.write(value)

                emitProgress(value)
              }

              clearInterval(checkIntervalId)

              signal.removeEventListener('abort', signalAbortHandler)

              // TODO: cari cara ngedetect unduhannya selesai kalo totalLengthnya engga ada (NaN)
              if (signal.aborted || (!isNaN(totalLength) && receivedLength >= totalLength)) {
                break
              }
            }

            clearInterval(setSkipIntervalId)

            if (signal.aborted) {
              if (!isResolved) {
                releaseMetadataLock()
              }

              throw new DOMException()
            }

            downloadProgressController.delete(emitKey)
            gdriveAccessTokenCache.delete(url)

            const lastProgress = downloadProgressSnapshot.get(emitKey)
            if (lastProgress) {
              const { text } = lastProgress

              // pake slice, biar hasil outputnya konsisten (kadang ada persenannya, kadang engga)
              emit('Mengunduh: ' + formattedTotalLength + text.slice(text.indexOf(' / ')))
            }

            // biar keluar dari queue untuk proses selanjutnya
            ;(async () => {
              await writer.end()

              let progress = 0
              const emitProgress = () => {
                emit(`Mengoptimalisasi video (${progress.toFixed(2)}%)`)
              }

              emitProgress()

              // ffmpeg nulis hasilnya ke stderr, bukan stdout
              const ffmpeg = Bun.spawn(
                [
                  'ffmpeg',
                  '-i',
                  tempFilePath,
                  '-c',
                  'copy',
                  '-movflags',
                  '+faststart',
                  '-v',
                  'quiet',
                  '-stats',
                  filePath,
                ],
                {
                  stdin: 'ignore',
                  stdout: 'ignore',
                  stderr: 'pipe',
                },
              )

              const ffmpegReader = ffmpeg.stderr.getReader()
              const textDecoder = new TextDecoder()

              // engga pake instance tempFile karena kena cache
              const videoSize = totalLength || Bun.file(tempFilePath).size

              let intervalId: Timer | undefined

              while (true) {
                const { done, value } = await ffmpegReader.read()
                if (done) {
                  progress = 100

                  emitProgress()

                  if (intervalId) {
                    clearInterval(intervalId)
                  }

                  break
                }

                const message = textDecoder.decode(value)
                const sizeIndex = message.lastIndexOf('size=  ')
                if (sizeIndex > -1) {
                  const sizeKilo = parseInt(message.slice(sizeIndex + 'size=  '.length))
                  progress = ((sizeKilo * 1024) / videoSize) * 100

                  emitProgress()

                  // setelah progress diatas 91%, ffmpegnya bakal stuck agak lama
                  // jadi biar progressnya ga stuck, dibuat progress palsu
                  if (!intervalId && progress > 91) {
                    intervalId = setInterval(() => {
                      // 2 angka magic yang kira kira pas
                      progress += (100 - progress) / 2

                      emitProgress()
                    }, 500) // ffmpeg nampilin progressnya tiap 500ms
                  }
                }
              }

              await fs.rm(tempFilePath)

              onFinish?.()

              emit('Video selesai diunduh', true)
            })()
          },
          { signal },
        )
        .catch(handleError)
    })
  }

  if (downloadQueue.pending === env.PARALLEL_DOWNLOAD_LIMIT) {
    emit('Menunggu unduhan sebelumnya')

    start()

    return { size: '' }
  }

  return new Promise(resolve => {
    start(formattedTotalLength => {
      resolve({ size: formattedTotalLength })
    })
  })
}

type GDriveCredentialsResponse = {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token: string
}
type GDriveFilesResponse = {
  files: {
    id: string
  }[]
}
type GDriveCredentialsReturn = {
  data: GDriveCredentialsResponse
  id: string
}

const gdriveAccessTokenCache = new Map<string, GDriveCredentialsReturn>()
/** source: https://kuramalink.me/serviceworker.js */
async function getGdriveCredentials(downloadUrl: string): Promise<GDriveCredentialsReturn> {
  const cache = gdriveAccessTokenCache.get(downloadUrl)
  if (cache) {
    return cache
  }

  const url = new URL(downloadUrl.replaceAll(';', '&'))

  const nullValues: string[] = []
  const getSearchParams = (name: string) => {
    const value = url.searchParams.get(name)
    if (value === null) {
      nullValues.push(name)

      return ''
    }

    return value
  }

  const komiOrigin = 'https://komi.my.id'

  let id: string
  if (downloadUrl.includes('.my.id/kdrive/')) {
    id = getSearchParams('gid')
  } else if (downloadUrl.startsWith(komiOrigin)) {
    id = getSearchParams('fn')
  } else {
    const message = `Unknown domain: ${downloadUrl}`

    logger.error(message, { downloadUrl })

    throw new SilentError(message)
  }

  const clientId = getSearchParams('id')
  const clientSecret = getSearchParams('sc')
  const refreshToken = getSearchParams('rt')

  if (nullValues.length > 0) {
    const message = `Download episode: ${nullValues.join(', ')} is null`

    logger.error(message, { downloadUrl })

    throw new SilentError(message)
  }

  const accessTokenResponse = await ky.post<GDriveCredentialsResponse>(
    'https://www.googleapis.com/oauth2/v4/token',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: toSearchParamString({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    },
  )

  const result = {
    data: await accessTokenResponse.json(),
  } as GDriveCredentialsReturn

  if (downloadUrl.startsWith(komiOrigin)) {
    const params = encodeURIComponent(`name ='${id}'`)

    const fileListResponse = await ky.get<GDriveFilesResponse>(
      `https://www.googleapis.com/drive/v3/files?q=${params}`,
      {
        headers: {
          Authorization: `Bearer ${result.data.access_token}`,
        },
      },
    )

    const { files } = await fileListResponse.json()
    if (files.length === 0) {
      const message = `File not found: ${id}`

      logger.error(message, { downloadUrl, id })

      throw new SilentError(message)
    }

    result.id = files[0]!.id
  } else {
    result.id = id
  }

  gdriveAccessTokenCache.set(downloadUrl, result)

  setTimeout(() => {
    gdriveAccessTokenCache.delete(downloadUrl)
  }, 3_000_000) // 3000 detik, tokennya cuma berlaku selama 1 jam

  return result
}

async function getKuramanimeInitProcess() {
  const js = await fetchText('assets/js/sizzly.js', {}, kyInstances.kuramanime)

  return v.parse(
    kuramanimeInitProcessSchema,
    parseFromJsObjectString(js.replace('window.init_process =', '').replace(';', '')),
  )
}

async function getKuramanimeProcess(anyKuramanimeEpisodeUrl: string) {
  let kpsUrl = await fetchText(anyKuramanimeEpisodeUrl, {}, kyInstances.kuramanime)
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('data-kps="'))
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('"') + 1, kpsUrl.indexOf('">'))

  if (!kpsUrl) {
    throw new EpisodeNotFoundError()
  }

  const kProcessJs = await fetchText(`assets/js/${kpsUrl}.js`, {}, kyInstances.kuramanime)
  const kProcess = v.parse(
    kuramanimeProcessSchema,
    parseFromJsObjectString(kProcessJs.replace('window.process =', '').replace(';', '')),
  )

  const pageToken = await fetchText(
    `assets/${kProcess.env.MIX_AUTH_ROUTE_PARAM}`,
    {},
    kyInstances.kuramanime,
  )

  return [pageToken, kProcess] as const
}

function generateDirSlug(animeData: Pick<typeof anime.$inferSelect, 'id' | 'title'>) {
  // list lengkap dan penjelasannya: https://stackoverflow.com/a/31976060

  let result = ''

  const forbiddenChars = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']) // 1
  for (const char of animeData.title) {
    if (!forbiddenChars.has(char) && char.charCodeAt(0) > 31 /* 2 */) {
      result += char
    }
  }

  // nomor 3 engga perlu diperhitungan, karena slugnya bakal diconcat sama id anime

  return result.replace(/\s+/g, ' ') + '.' + animeData.id
}
