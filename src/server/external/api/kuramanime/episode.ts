import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import ky, { HTTPError } from 'ky'
import * as v from 'valibot'
import { env } from '~/env'
import * as kyInstances from '~s/ky'
import { anime, animeMetadata } from '~s/db/schema'
import { videosDirPath, animeVideoRealDirPath } from '~s/utils/path'
import { logger } from '~s/utils/logger'
import {
  EpisodeNotFoundError,
  LeviathanExecutionError,
  LeviathanSrcNotFoundError,
  SilentError,
} from '~s/error'
import { metadataQueue, downloadQueue } from '~s/external/queue'
import {
  downloadProgress,
  downloadProgressController,
  downloadSizeMap,
  type DownloadProgress,
  type OptimizingProgress,
} from '~s/external/download/progress'
import { downloadMeta } from '~s/external/download/meta'
import { executeLeviathan } from '~s/external/api/kuramanime/executeLeviathan'
import { fetchText } from '~s/utils/fetch'
import { isOffline } from '~s/utils/error'
import { isSubstringPresent } from '~s/utils/file'
import { purgeStoredCache } from '~s/anime/episode/stored'
import { ReaderNotFoundError, TimeoutError } from '~/shared/error'
import { formatBytes } from '~/shared/utils/byte'
import { parseFromJsObjectString } from '~/shared/utils/json'
import { toSearchParamString } from '~/shared/utils/url'
import { timeoutThrow } from '~/shared/utils/promise'

const kuramanimeInitProcessSchema = v.object({
  env: v.object({
    MIX_JS_ROUTE_PARAM_ATTR_KEY: v.string(),
    MIX_JS_ROUTE_PARAM_ATTR: v.string(),
  }),
})

const kuramanimeProcessSchema = v.object({
  env: v.object({
    MIX_AUTH_KEY: v.string(),
    MIX_AUTH_TOKEN: v.string(),
    MIX_PREFIX_AUTH_ROUTE_PARAM: v.string(),
    MIX_AUTH_ROUTE_PARAM: v.string(),
    MIX_PAGE_TOKEN_KEY: v.string(),
    MIX_STREAM_SERVER_KEY: v.string(),
  }),
})

let kMIX_PAGE_TOKEN_VALUE: string | null
let kProcess: v.InferInput<typeof kuramanimeProcessSchema> | null
let kInitProcess: v.InferInput<typeof kuramanimeInitProcessSchema> | null

let authorizationToken: string | null
const authorizationTokenMap = new Map<string, string>()

export const generateEmitKey = (
  animeData: Pick<typeof anime.$inferSelect, 'title' | 'totalEpisodes'>,
  episodeNumber: number,
) => {
  return animeData.title + (animeData.totalEpisodes === 1 ? '' : `: Episode ${episodeNumber}`)
}

export const initDownloadEpisode = (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title' | 'totalEpisodes'>,
  episodeNumber: number,
) => {
  const emitKey = generateEmitKey(animeData, episodeNumber)

  downloadProgress.emit(emitKey, {
    status: 'OTHER',
    text: 'Menginisialisasi proses unduhan',
  })

  downloadMeta.set(emitKey, {
    animeId: animeData.id,
    episodeNumber,
  })
}

const getDownloadUrl = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title' | 'totalEpisodes'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
  emit: (data: string) => void,
  done: (data: string) => void,
  signal?: AbortSignal,
): Promise<string> => {
  const url = await (async () => {
    {
      const episodeUrl = `anime/${metadata.providerId}/${metadata.providerSlug}/episode/${episodeNumber}`

      if (!kMIX_PAGE_TOKEN_VALUE || !kProcess || !kInitProcess || !authorizationToken) {
        emit('Mengambil token dari Kuramanime')

        kInitProcess = await getKuramanimeInitProcess()

        try {
          ;[kMIX_PAGE_TOKEN_VALUE, kProcess, authorizationToken] = await getKuramanimeProcess(
            kInitProcess!,
            episodeUrl,
          )
        } catch (error) {
          if (
            error instanceof LeviathanExecutionError ||
            error instanceof LeviathanSrcNotFoundError
          ) {
            emit(
              'Gagal mendapatkan token auth Kuramanime\nHarap update Web Animeh ke versi terbaru',
            )

            logger.error('Failed to get Kuramanime auth token', {
              message: error.message,
            })

            await new Promise(() => {}) // block selamanya
          }

          throw error
        }
      }

      const searchParams = toSearchParamString({
        [kProcess!.env.MIX_PAGE_TOKEN_KEY]: kMIX_PAGE_TOKEN_VALUE!,
        [kProcess!.env.MIX_STREAM_SERVER_KEY]: 'kuramadrive',
        page: 1,
      })

      emit('Mengambil tautan unduh dari Kuramanime')

      const responseHtml = await fetchText(
        `${episodeUrl}?${searchParams}`,
        {
          signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: 'authorization=' + authorizationToken,
        },
        kyInstances.kuramanime.post,
      )

      const handleDownloadUrlNotFound = () => {
        // authorization tokennya expired
        if (responseHtml.includes('Terjadi kesalahan saat mengambil video')) {
          authorizationToken = null

          return getDownloadUrl(animeData, metadata, episodeNumber, emit, done, signal)
        }

        // tokennya expired
        if (responseHtml.includes('Terjadi kesalahan saat mengambil tautan unduh')) {
          kMIX_PAGE_TOKEN_VALUE = null
          kProcess = null
          kInitProcess = null

          return getDownloadUrl(animeData, metadata, episodeNumber, emit, done, signal)
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
                resolve(getDownloadUrl(animeData, metadata, episodeNumber, emit, done, signal))
              }, diff)
            })
          }
        }

        done('Terjadi error yang tidak diketahui. Harap cek log')

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
  })()

  return url.replaceAll('&amp;', '&').replace(/%5C$/, '')
}

export const downloadEpisode = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title' | 'totalEpisodes'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
  onFinish?: () => void,
): Promise<{ size: string | null } | null> => {
  initDownloadEpisode(animeData, episodeNumber)

  const emitKey = generateEmitKey(animeData, episodeNumber)

  function emit(data: string): void
  function emit(data: OptimizingProgress): void
  function emit(data: DownloadProgress, text?: string): void
  function emit(data: string | OptimizingProgress | DownloadProgress, text?: string) {
    if (typeof data === 'string') {
      downloadProgress.emit(emitKey, {
        status: 'OTHER',
        text: data,
      })
    } else if ('percent' in data) {
      downloadProgress.emit(emitKey, {
        status: 'OPTIMIZING',
        progress: data,
      })
    } else {
      downloadProgress.emit(emitKey, {
        status: 'DOWNLOADING',
        progress: data,
        text,
      })
    }
  }
  const done = (text: string) => {
    downloadProgress.emit(emitKey, { status: 'OTHER', done: true, text })
  }

  let animeDirPath = await animeVideoRealDirPath(animeData.id)
  let shouldCheck = true
  if (!animeDirPath) {
    animeDirPath = videosDirPath + generateDirSlug(animeData) + path.sep
    shouldCheck = false
  }

  const fileName = episodeNumber.toString().padStart(2, '0')
  const filePath = animeDirPath + fileName + '.mp4'

  if (shouldCheck && (await Bun.file(filePath).exists())) {
    done('Episode ini telah diunduh')

    return null
  }

  const tempFilePath = animeDirPath + fileName + '_.mp4'
  const initialLength = Bun.file(tempFilePath).size

  const abortController = new AbortController()
  const { signal } = abortController

  signal.addEventListener('abort', event => {
    if (event.target instanceof AbortSignal && event.target.reason === 'pause') {
      done('Unduhan dijeda')
    } else {
      // defaultnya cancel
      fs.rm(tempFilePath, { force: true })
      fs.rm(filePath, { force: true })

      done('Unduhan dibatalkan')
    }

    // @ts-expect-error
    emit = () => {
      throw new DOMException()
    }
  })

  downloadProgressController.set(emitKey, abortController)

  const start = (formattedTotalLengthCb?: (formattedTotalLength: string | null) => void) => {
    const handleError = (error: any) => {
      if (error instanceof TimeoutError) {
        if (isOffline(error)) {
          done('Tidak dapat terhubung dengan internet')
        } else {
          done('Kuramanime tidak dapat diakses')
        }
      }

      // kalo "error"nya dari `AbortController.abort`, variabel error nilainya sesuai parameternya
      // untuk sekarang parameternya antara undefined (default) atau string
      if (!(error === undefined || typeof error === 'string' || error instanceof DOMException)) {
        done('Terjadi kesalahan')

        throw error
      }
    }

    const downloadVideo = async (url: string, start: number) => {
      const gdriveCredentials = await getGdriveCredentials(url)

      const requestedAt = performance.now()
      const request = gdriveCredentials
        ? ky.get(`https://www.googleapis.com/drive/v3/files/${gdriveCredentials.id}?alt=media`, {
            signal,
            headers: {
              Range: `bytes=${start}-`,
              Authorization: `Bearer ${gdriveCredentials.data.access_token}`,
            },
          })
        : ky.get(url, {
            signal,
            headers: {
              Range: `bytes=${start}-`,
            },
          })

      return {
        response: await timeoutThrow(request, 5_000),
        requestedAt,
      }
    }

    const isMoovAtomInFront = () => {
      return isSubstringPresent(tempFilePath, 'moov', 4 * 1024 * 1024)
    }

    let isVideoAlreadyOptimizedPromise: Promise<boolean> | undefined
    const optimizeVideo = async () => {
      if (await (isVideoAlreadyOptimizedPromise ?? isMoovAtomInFront())) {
        await fs.rename(tempFilePath, filePath)

        onFinish?.()

        done('Video selesai diunduh')

        return
      }

      emit({ percent: 0 })

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
        // ffmpeg nulis hasilnya ke stderr, bukan stdout
        {
          stdin: 'ignore',
          stdout: 'ignore',
          stderr: 'pipe',
        },
      )

      const ffmpegReader = ffmpeg.stderr.getReader()
      const textDecoder = new TextDecoder()

      // engga pake instance tempFile karena kena cache
      const videoSize = Bun.file(tempFilePath).size

      let intervalId: Timer | undefined

      let buffer = ''
      while (true) {
        const { done, value } = await ffmpegReader.read()
        if (done) {
          emit({ percent: 100 })

          if (intervalId) {
            clearInterval(intervalId)
          }

          break
        }

        // diwindows, output dari ffmpeg bisa kena buffer
        // jadi progressnya kepisah jadi lebih dari 1 message
        buffer += textDecoder.decode(value)

        const indexOfTerminator = buffer.indexOf('\r')
        if (indexOfTerminator === -1) {
          continue
        }

        const message = buffer.slice(0, indexOfTerminator)
        buffer = buffer.slice(indexOfTerminator + 1)

        const sizeIndex = message.lastIndexOf('size=  ')
        if (sizeIndex > -1) {
          const sizeKilo = parseInt(message.slice(sizeIndex + 'size=  '.length))
          let progress = ((sizeKilo * 1024) / videoSize) * 100

          emit({ percent: progress })

          // setelah progress diatas 91%, ffmpegnya bakal stuck agak lama
          // jadi biar progressnya ga stuck, dibuat progress palsu
          if (!intervalId && progress > 91) {
            intervalId = setInterval(() => {
              // 2 angka magic yang kira kira pas
              progress += (100 - progress) / 2

              emit({ percent: progress })
            }, 500) // ffmpeg nampilin progressnya tiap 500ms
          }
        }
      }

      await fs.rm(tempFilePath)

      onFinish?.()

      done('Video selesai diunduh')
    }

    const metadataLock = new Promise<void>(releaseMetadataLock => {
      let downloadIsStarted = false

      const prepareResponsePromise = new Promise<
        [string] | [string, { response: Response; requestedAt: number }]
      >((resolvePreparedResponse, reject) => {
        metadataQueue
          .add(
            async () => {
              const url = await getDownloadUrl(
                animeData,
                metadata,
                episodeNumber,
                emit,
                done,
                signal,
              )

              try {
                const preparedResponse = await downloadVideo(url, initialLength)

                if (!downloadIsStarted) {
                  emit('Menunggu unduhan sebelumnya selesai')
                }

                resolvePreparedResponse([url, preparedResponse])
              } catch (error) {
                if (error instanceof HTTPError && error.response.status === 416) {
                  resolvePreparedResponse([url])
                } else {
                  throw error
                }
              }

              await metadataLock
            },
            { signal },
          )
          .catch(reject)
      }).catch(handleError)

      downloadQueue
        .add(
          async () => {
            downloadIsStarted = true

            let receivedLength = initialLength
            let fetchedLength = 0

            emit((initialLength ? 'Lanjut' : 'Mulai') + ' mengunduh')

            const prepared = await prepareResponsePromise
            if (!prepared) {
              return
            }

            const [url, preparedResponse] = prepared
            if (!preparedResponse) {
              optimizeVideo()

              return
            }

            const contentLength = preparedResponse.response.headers?.get('Content-Length')
            const totalLength = contentLength ? initialLength + Number(contentLength) : null
            const formattedTotalLength = totalLength ? formatBytes(totalLength) : null

            formattedTotalLengthCb?.(formattedTotalLength)

            if (totalLength) {
              downloadSizeMap.set(`${animeData.id}:${episodeNumber}`, totalLength)
            }

            await fs.mkdir(animeDirPath, { recursive: true })

            if (!shouldCheck) {
              purgeStoredCache()
            }

            const UPDATES_PER_SECOND = 16
            const CALCULATE_SPEED_PER_SECOND = UPDATES_PER_SECOND / 2
            const HISTORY_SIZE = CALCULATE_SPEED_PER_SECOND / 2
            const speedHistory = Array(HISTORY_SIZE).fill(0)

            let isResolved = false
            let lastTimestamp: number
            let lastFetchedLength = 0

            let emitProgressCounter = 0
            let historyIndex = 0
            let historyCount = 0

            let speed: number

            const emitProgress = () => {
              if (emitProgressCounter++ % CALCULATE_SPEED_PER_SECOND === 0) {
                const now = performance.now()
                const elapsedSinceLastEmit = (now - lastTimestamp) / 1e3 // ms -> s
                const intervalSpeed = (fetchedLength - lastFetchedLength) / elapsedSinceLastEmit

                speedHistory[historyIndex] = intervalSpeed
                historyIndex = (historyIndex + 1) % HISTORY_SIZE
                historyCount = Math.min(historyCount + 1, HISTORY_SIZE)
                lastFetchedLength = fetchedLength

                speed = speedHistory.reduce((sum, s) => sum + s, 0) / historyCount

                lastTimestamp = now
              }

              if (!isResolved && totalLength) {
                const remainingTime = (totalLength - receivedLength) / speed

                if (remainingTime < 2) {
                  isResolved = true

                  releaseMetadataLock()

                  isVideoAlreadyOptimizedPromise = isMoovAtomInFront()
                }
              }

              emit({
                speed,
                receivedLength,
                totalLength,
              })
            }

            const tempFileStream = createWriteStream(tempFilePath, {
              flags: 'a',
              highWaterMark: 4 * 1024 * 1024, // 4 MB
            })

            let emitIntervalId: Timer | undefined

            let iteration = 0

            while (true) {
              const firstTime = ++iteration === 1
              try {
                const { response, requestedAt } = firstTime
                  ? preparedResponse
                  : await downloadVideo(url, receivedLength)

                iteration = 1

                lastTimestamp = requestedAt

                const reader = (response.body as ReadableStream<Uint8Array> | null)?.getReader()
                if (!reader) {
                  throw new ReaderNotFoundError()
                }

                const signalAbortHandler = () => {
                  reader.cancel()
                }

                signal.addEventListener('abort', signalAbortHandler)

                emitIntervalId = setInterval(emitProgress, 1000 / UPDATES_PER_SECOND)

                while (true) {
                  const { done, value } = await timeoutThrow(reader.read(), 5_000)

                  if (done) {
                    break
                  }

                  tempFileStream.write(value)

                  fetchedLength += value.length
                  receivedLength += value.length
                }

                clearInterval(emitIntervalId)

                signal.removeEventListener('abort', signalAbortHandler)

                // TODO: cari cara ngedetect unduhannya selesai kalo totalLengthnya engga ada (NaN)
                if (signal.aborted || (totalLength !== null && receivedLength >= totalLength)) {
                  break
                }
              } catch (error) {
                if (error instanceof ReaderNotFoundError) {
                  break
                } else if (error instanceof TimeoutError || isOffline(error, firstTime)) {
                  if (emitIntervalId) {
                    clearInterval(emitIntervalId)

                    emitIntervalId = undefined
                  }

                  const data: DownloadProgress = {
                    speed: 0,
                    receivedLength,
                    totalLength,
                  }

                  if (iteration > 1) {
                    const delaySeconds = Math.min(iteration ** 2, 30)

                    for (let second = delaySeconds; second > 0; second--) {
                      emit(data, `Mengunduh ulang dalam ${second} detik`)

                      await Bun.sleep(1000)
                    }
                  }

                  emit(data, 'Mengunduh ulang')
                }
              }
            }

            if (signal.aborted) {
              if (!isResolved) {
                releaseMetadataLock()
              }

              throw new DOMException()
            }

            downloadProgressController.delete(emitKey)
            gdriveAccessTokenCache.delete(url)

            emitProgress()

            downloadSizeMap.delete(`${animeData.id}:${episodeNumber}`)

            tempFileStream.end(optimizeVideo)
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

export const streamingEpisode = (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'title' | 'totalEpisodes'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
) => {
  return getDownloadUrl(
    animeData,
    metadata,
    episodeNumber,
    () => {},
    () => {},
  )
}

type GDriveCredentialsResponse = {
  access_token: string
  gid?: string
}
type GDriveCredentials = {
  data: GDriveCredentialsResponse
  id: string
}

const gdriveAccessTokenCache = new Map<string, GDriveCredentials>()
/** source: https://kuramalink.me/serviceworker.js */
async function getGdriveCredentials(downloadUrl: string): Promise<GDriveCredentials | null> {
  const url = new URL(downloadUrl.replaceAll(';', '&'))

  if (url.searchParams.has('kid')) {
    return null
  }

  const cache = gdriveAccessTokenCache.get(downloadUrl)
  if (cache) {
    return cache
  }

  const nullValues: string[] = []
  const getSearchParams = (name: string) => {
    const value = url.searchParams.get(name)
    if (value === null) {
      nullValues.push(name)

      return ''
    }

    return value
  }

  if (downloadUrl.startsWith('https://komi.my.id')) {
    // di sourcenya jadi return false, kurang tau maksudnya apa
    logger.warn('Download from the komi domain', { downloadUrl })
  } else if (!downloadUrl.includes('.my.id/kdrive/')) {
    return null
  }

  const pid = getSearchParams('pid')
  const sid = getSearchParams('sid')

  if (nullValues.length > 0) {
    const message = `Download episode: ${nullValues.join(', ')} is null`

    throw new SilentError(message).log(message, { downloadUrl })
  }

  const accessTokenResponse = await kyInstances.kuramanime.post<GDriveCredentialsResponse>(
    'misc/token/drive-token',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pid, sid }),
    },
  )
  const result = {
    data: await accessTokenResponse.json(),
  } as GDriveCredentials

  if (!result.data.gid) {
    throw new SilentError('No gid').log('No gid', { downloadUrl })
  } else {
    result.id = result.data.gid
  }

  gdriveAccessTokenCache.set(downloadUrl, result)

  setTimeout(() => {
    gdriveAccessTokenCache.delete(downloadUrl)
  }, 3_000_000) // 3000 detik, tokennya cuma berlaku selama 1 jam

  return result
}

async function getKuramanimeInitProcess() {
  const js = await fetchText('assets/js/sizzlyb.js', {}, kyInstances.kuramanime)

  return v.parse(
    kuramanimeInitProcessSchema,
    parseFromJsObjectString(js.replace('window.init_process =', '').replace(';', '')),
  )
}

async function getKuramanimeProcess(
  kuramanimeInitProcess: v.InferOutput<typeof kuramanimeInitProcessSchema>,
  anyKuramanimeEpisodeUrl: string,
) {
  const source = await fetchText(anyKuramanimeEpisodeUrl, {}, kyInstances.kuramanime)

  const leviathanSrc = source.match(/<input type="hidden" id="tokenAuthJs" value="\/(.*?)"/)?.[1]
  if (!leviathanSrc) {
    throw new LeviathanSrcNotFoundError('Leviathan source not found')
  }

  let mixEnvUrl = source.slice(
    source.indexOf(`${kuramanimeInitProcess.env.MIX_JS_ROUTE_PARAM_ATTR}="`),
  )
  mixEnvUrl = mixEnvUrl.slice(mixEnvUrl.indexOf('"') + 1, mixEnvUrl.indexOf('">'))

  if (!mixEnvUrl) {
    throw new EpisodeNotFoundError()
  }

  const [leviathanSource, kProcessJs] = await Promise.all([
    fetchText(leviathanSrc, {}, kyInstances.kuramanime),
    fetchText(`assets/js/${mixEnvUrl}.js`, {}, kyInstances.kuramanime),
  ])

  const leviathanId = getLeviathanIdentifier(leviathanSrc)
  let authorizationToken = authorizationTokenMap.get(leviathanId)
  if (!authorizationToken) {
    authorizationToken = await executeLeviathan(leviathanSource)

    authorizationTokenMap.set(leviathanId, authorizationToken)
  }

  const kProcess = v.parse(
    kuramanimeProcessSchema,
    parseFromJsObjectString(kProcessJs.replace('window.process =', '').replace(';', '')),
  )
  const e = kProcess.env
  const pageToken = await fetchText(
    e.MIX_PREFIX_AUTH_ROUTE_PARAM + e.MIX_AUTH_ROUTE_PARAM,
    {
      headers: {
        'X-Fuck-ID': `${e.MIX_AUTH_KEY}:${e.MIX_AUTH_TOKEN}`,
        'X-Request-ID': generateRandomString(6),
        'X-Request-Index': '0',
        'X-Request-With': 'XMLHttpRequest',
      },
    },
    kyInstances.kuramanime,
  )

  return [pageToken, kProcess, authorizationToken] as const
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

function generateRandomString(length: number) {
  let result = ''
  const len = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.length

  for (let i = 0; i < length; i++)
    result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
      Math.floor(Math.random() * len),
    )

  return result
}

function getLeviathanIdentifier(leviathanSrc: string) {
  return leviathanSrc.slice(leviathanSrc.indexOf('?') + 1)
}
