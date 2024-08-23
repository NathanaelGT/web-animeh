import fs from 'fs/promises'
import path from 'path'
import * as v from 'valibot'
import { env } from '~/env'
import { anime, animeMetadata } from '~s/db/schema'
import { videosDirPath, animeVideoRealDirPath } from '~s/utils/path'
import { logger } from '~s/utils/logger'
import { EpisodeNotFoundError } from '~s/error'
import { metadataQueue, downloadQueue } from '~s/external/queue'
import { downloadProgress } from '~s/external/download/progress'
import { kuramanimeGlobalDataSchema, prepare as kdrivePrepare } from '~s/external/download/kdrive'
import { fetchText } from '~/shared/utils/fetch'
import { formatBytes } from '~/shared/utils/byte'
import { parseFromJsObjectString } from '~/shared/utils/json'
import { parseNumber } from '~/shared/utils/number'

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
let kGlobalData: v.InferInput<typeof kuramanimeGlobalDataSchema> | null

const unsetCredentials = () => {
  kMIX_PAGE_TOKEN_VALUE = null
  kProcess = null
  kInitProcess = null
  kGlobalData = null
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
    const checks = await Promise.all([tempFile.exists(), Bun.file(filePath).exists()])

    if (checks.some(exists => exists)) {
      return null
    }
  }

  const episodeUrl = new URL('https://kuramanime.' + env.KURAMANIME_TLD)
  episodeUrl.pathname = `/anime/${metadata.providerId}/${metadata.providerSlug}/episode/${episodeNumber}`

  const emitKey = `${animeData.title}: Episode ${episodeNumber}`

  const getDownloadUrl = async () => {
    if (!kMIX_PAGE_TOKEN_VALUE || !kProcess || !kInitProcess || !kGlobalData) {
      downloadProgress.emit(emitKey, { text: 'Mengambil token dari kuramanime' })
      ;[[kMIX_PAGE_TOKEN_VALUE, kProcess], kInitProcess, kGlobalData] = await Promise.all([
        getKuramanimeProcess(episodeUrl.toString()),
        getKuramanimeInitProcess(),
        getKuramanimeGlobalData(),
      ])
    }

    episodeUrl.searchParams.set(kProcess.env.MIX_PAGE_TOKEN_KEY, kMIX_PAGE_TOKEN_VALUE)
    episodeUrl.searchParams.set(kProcess.env.MIX_STREAM_SERVER_KEY, 'kuramadrive')
    episodeUrl.searchParams.set('page', '1')

    downloadProgress.emit(emitKey, { text: 'Mengambil tautan unduh dari kuramanime' })
    const responseHtml = await fetchText(episodeUrl.toString())

    let downloadUrl = responseHtml.slice(responseHtml.lastIndexOf('MP4 720p (Hardsub)'))

    if (downloadUrl.length < 2) {
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

    downloadUrl = downloadUrl.slice(downloadUrl.indexOf('https://kuramadrive.com/kdrive/'))
    downloadUrl = downloadUrl.slice(0, downloadUrl.indexOf('"'))

    return downloadUrl
  }

  const start = (formattedContentLengthCb?: (formattedContentLength: string | null) => void) => {
    const metadataLock = new Promise<void>(releaseMetadataLock => {
      let downloadIsStarted = false

      const prepareResponsePromise = new Promise<Response>(resolvePreparedResponse => {
        metadataQueue.add(async () => {
          const preparedResponse = await kdrivePrepare(await getDownloadUrl(), kGlobalData!)

          if (!downloadIsStarted) {
            downloadProgress.emit(emitKey, { text: 'Menunggu unduhan sebelumnya selesai' })
          }

          resolvePreparedResponse(preparedResponse)

          await metadataLock
        })
      })

      downloadQueue.add(async () => {
        downloadIsStarted = true

        downloadProgress.emit(emitKey, {
          text: 'Mulai mengunduh',
        })

        const mkDirPromise = fs.mkdir(animeDirPath, { recursive: true })
        const preparedResponse = await prepareResponsePromise
        const reader = (preparedResponse.body as ReadableStream<Uint8Array> | null)?.getReader()
        if (!reader) {
          throw new Error('no reader')
        }

        const contentLength = parseNumber(preparedResponse.headers?.get('Content-Length'))
        const formattedContentLength = contentLength ? formatBytes(contentLength) : null

        formattedContentLengthCb?.(formattedContentLength)

        await mkDirPromise

        const writer = tempFile.writer({ highWaterMark: 4 * 1024 * 1024 }) // 4 MB
        let receivedLength = 0
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
            contentLength &&
            contentLength - receivedLength < PREDOWNLOAD_VIDEO_METADATA_THRESHOLD
          ) {
            isResolved = true

            releaseMetadataLock()
          }

          let text = 'Mengunduh: ' + formatBytes(receivedLength)
          const speed = '@' + formatBytes(receivedLength / elapsedTime) + '/s'

          if (contentLength) {
            text +=
              ' / ' +
              formattedContentLength +
              speed +
              ' (' +
              ((receivedLength / contentLength) * 100).toFixed(2) +
              '%)'
          } else {
            text += speed
          }

          downloadProgress.emit(emitKey, { text })
        }
        const intervalId = setInterval(() => {
          skip = false
        }, 50)

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          writer.write(value)

          emitProgress(value)
        }

        clearInterval(intervalId)

        downloadProgress.emit(emitKey, {
          text: `Mengunduh: ${formattedContentLength} / ${formattedContentLength} (100%)`,
        })

        // biar keluar dari queue untuk proses selanjutnya
        ;(async () => {
          await writer.end()

          downloadProgress.emit(emitKey, { text: 'Mengoptimalisasi video' })

          await Bun.$`ffmpeg -i ${tempFilePath} -codec copy -movflags +faststart ${filePath}`.quiet()

          downloadProgress.emit(emitKey, { text: 'Video selesai diunduh', done: true })

          await fs.rm(tempFilePath)

          onFinish?.()
        })()
      })
    })
  }

  if (downloadQueue.pending === env.PARALLEL_DOWNLOAD_LIMIT) {
    downloadProgress.emit(emitKey, { text: 'Menunggu unduhan sebelumnya' })
    start()

    return { size: '' }
  }

  downloadProgress.emit(emitKey, { text: 'Menginisialisasi proses unduhan' })

  return new Promise(resolve => {
    start(formattedContentLength => {
      resolve({ size: formattedContentLength })
    })
  })
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

async function getKuramanimeGlobalData() {
  const js = await fetchText('https://kuramadrive.com/api/v1/var/js/master.js')

  return v.parse(
    kuramanimeGlobalDataSchema,
    parseFromJsObjectString(js.replace('window.GLOBAL_DATA =', '').replace(';', '')),
  )
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
