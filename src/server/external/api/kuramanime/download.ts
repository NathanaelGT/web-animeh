import fs from 'fs/promises'
import path from 'path'
import ky from 'ky'
import * as v from 'valibot'
import { env } from '~/env'
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

export const downloadEpisode = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
  onFinish?: () => void,
): Promise<{ size: string | null } | null> => {
  let animeDirPath = await animeVideoRealDirPath(animeData.id)
  let shouldCheck = true
  if (!animeDirPath) {
    animeDirPath = videosDirPath + generateDirSlug(animeData) + path.sep
    shouldCheck = false
  }

  const fileName = episodeNumber.toString().padStart(2, '0')
  const filePath = animeDirPath + fileName + '.mp4'
  const tempFilePath = animeDirPath + fileName + '_.mp4'
  const tempFile = Bun.file(tempFilePath)

  if (shouldCheck) {
    if (await Bun.file(filePath).exists()) {
      return null
    }
  }

  const abortController = new AbortController()
  const { signal } = abortController

  signal.addEventListener('abort', () => {
    fs.rm(tempFilePath, { force: true })
    fs.rm(filePath, { force: true })

    downloadProgress.emit(emitKey, { text: 'Unduhan dibatalkan', done: true })
  })

  const episodeUrl = new URL('https://kuramanime.' + env.KURAMANIME_TLD)
  episodeUrl.pathname = `/anime/${metadata.providerId}/${metadata.providerSlug}/episode/${episodeNumber}`

  const emitKey = `${animeData.title}: Episode ${episodeNumber}`

  downloadProgressController.set(emitKey, abortController)

  const setCredentials = async () => {
    downloadProgress.emit(emitKey, { text: 'Mengambil token dari kuramanime' })
    ;[[kMIX_PAGE_TOKEN_VALUE, kProcess], kInitProcess] = await Promise.all([
      getKuramanimeProcess(episodeUrl.toString()),
      getKuramanimeInitProcess(),
    ])
  }

  const getDownloadUrl = async () => {
    if (!kMIX_PAGE_TOKEN_VALUE || !kProcess || !kInitProcess) {
      await setCredentials()
    }

    episodeUrl.searchParams.set(kProcess!.env.MIX_PAGE_TOKEN_KEY, kMIX_PAGE_TOKEN_VALUE!)
    episodeUrl.searchParams.set(kProcess!.env.MIX_STREAM_SERVER_KEY, 'kuramadrive')
    episodeUrl.searchParams.set('page', '1')

    downloadProgress.emit(emitKey, { text: 'Mengambil tautan unduh dari kuramanime' })
    const responseHtml = await fetchText(episodeUrl.toString(), { signal })

    let downloadUrl = responseHtml.slice(
      responseHtml.indexOf('id="source720" src="') + 'id="source720" src="'.length,
    )
    downloadUrl = downloadUrl.slice(0, downloadUrl.indexOf('"'))

    if (!downloadUrl.startsWith('http')) {
      // tokennya expired
      if (responseHtml.includes('Terjadi kesalahan saat mengambil tautan unduh')) {
        unsetCredentials()

        return getDownloadUrl()
      }

      downloadProgress.emit(emitKey, {
        text: 'Terjadi error yang tidak diketahui. Harap cek log',
        done: true,
      })

      logger.error('Download episode: unknown error', {
        localAnime: animeData,
        metadata,
        episodeNumber,
        responseHtml,
      })

      throw new Error('unknown error')
    }

    return downloadUrl
  }

  const start = (
    initialEmitText: string,
    formattedTotalLengthCb?: (formattedTotalLength: string | null) => void,
  ) => {
    downloadProgress.emit(emitKey, { text: initialEmitText })

    const handleError = (error: any) => {
      // engga tau undefined dari yang mana, tapi penyebabnya dari signal
      if (!(error === undefined || error instanceof DOMException)) {
        downloadProgress.emit(emitKey, { text: 'Terjadi kesalahan', done: true })

        throw error
      }
    }

    const downloadVideo = async (url: string, start: number) => {
      const gdriveCredentials = await getGdriveCredentials(url)

      return ky.get(
        `https://www.googleapis.com/drive/v3/files/${gdriveCredentials.gid}?alt=media`,
        {
          signal,
          headers: {
            Range: `bytes=${start}-`,
            Authorization: `Bearer ${gdriveCredentials.data.access_token}`,
          },
        },
      )
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
                  downloadProgress.emit(emitKey, { text: 'Menunggu unduhan sebelumnya selesai' })
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

            downloadProgress.emit(emitKey, {
              text: (initialLength ? 'Lanjut' : 'Mulai') + ' mengunduh',
            })

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

              downloadProgress.emit(emitKey, { text })
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

              downloadProgress.emit(emitKey, {
                // pake slice, biar hasil outputnya konsisten (kadang ada persenannya, kadang engga)
                text: 'Mengunduh: ' + formattedTotalLength + text.slice(text.indexOf(' / ')),
              })
            }

            // biar keluar dari queue untuk proses selanjutnya
            ;(async () => {
              await writer.end()

              downloadProgress.emit(emitKey, { text: 'Mengoptimalisasi video' })

              await Bun.$`ffmpeg -i ${tempFilePath} -c copy -movflags +faststart ${filePath}`.quiet()

              downloadProgress.emit(emitKey, { text: 'Video selesai diunduh', done: true })

              await fs.rm(tempFilePath)

              onFinish?.()
            })()
          },
          { signal },
        )
        .catch(handleError)
    })
  }

  if (downloadQueue.pending === env.PARALLEL_DOWNLOAD_LIMIT) {
    start('Menunggu unduhan sebelumnya')

    return { size: '' }
  }

  return new Promise(resolve => {
    start('Menginisialisasi proses unduhan', formattedTotalLength => {
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
type GDriveCredentialsReturn = {
  reqTime: number
  data: GDriveCredentialsResponse
  gid: string
}

const gdriveAccessTokenCache = new Map<string, GDriveCredentialsReturn>()
async function getGdriveCredentials(downloadUrl: string): Promise<GDriveCredentialsReturn> {
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

  const clientId = getSearchParams('id')
  const clientSecret = getSearchParams('sc')
  const refreshToken = getSearchParams('rt')
  const driveId = getSearchParams('gid')

  if (nullValues.length > 0) {
    const message = `Download episode: ${nullValues.join(', ')} is null`

    logger.error(message, { downloadUrl })

    throw new SilentError(message)
  }

  const cache = gdriveAccessTokenCache.get(downloadUrl)
  if (cache) {
    const now = performance.now()
    const diff = now - cache.reqTime
    // 3000 detik, tokennya cuma berlaku selama 1 jam
    if (diff < 3_000_000) {
      return cache
    }
  }

  const accessTokenResponse = await ky.post<GDriveCredentialsResponse>(
    'https://www.googleapis.com/oauth2/v4/token',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: 'refresh_token',
      }).toString(),
    },
  )

  const result: GDriveCredentialsReturn = {
    reqTime: performance.now(),
    data: await accessTokenResponse.json(),
    gid: driveId,
  }

  gdriveAccessTokenCache.set(downloadUrl, result)

  return result
}

async function getKuramanimeInitProcess() {
  const js = await fetchText(`https://kuramanime.${env.KURAMANIME_TLD}/assets/js/sizzly.js`)

  return v.parse(
    kuramanimeInitProcessSchema,
    parseFromJsObjectString(js.replace('window.init_process =', '').replace(';', '')),
  )
}

async function getKuramanimeProcess(anyKuramanimeEpisodeUrl: string) {
  let kpsUrl = await fetchText(anyKuramanimeEpisodeUrl)
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('data-kps="'))
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('"') + 1, kpsUrl.indexOf('">'))

  if (!kpsUrl) {
    throw new EpisodeNotFoundError()
  }

  const kProcessJs = await fetchText(
    `https://kuramanime.${env.KURAMANIME_TLD}/assets/js/${kpsUrl}.js`,
  )
  const kProcess = v.parse(
    kuramanimeProcessSchema,
    parseFromJsObjectString(kProcessJs.replace('window.process =', '').replace(';', '')),
  )

  const pageToken = await fetchText(
    `https://kuramanime.${env.KURAMANIME_TLD}/assets/${kProcess.env.MIX_AUTH_ROUTE_PARAM}`,
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
