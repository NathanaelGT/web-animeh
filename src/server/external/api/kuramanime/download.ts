import fs from 'fs/promises'
import path from 'path'
import z from 'zod'
import { env } from '~/env'
import { anime, animeMetadata } from '~s/db/schema'
import { videosDirPath } from '~s/utils/path'
import { logger } from '~s/utils/logger'
import { fetchText, fetchWindowJson } from '~/shared/utils/fetch'
import { formatBytes } from '~/shared/utils/byte'
import { EpisodeNotFoundError } from '~s/error'
import { downloadProgress } from '~s/external/download/progress'
import { kuramanimeGlobalDataSchema, download as kdriveDownload } from '~s/external/download/kdrive'

const kuramanimeInitProcessSchema = z.object({
  env: z.object({
    MIX_JS_ROUTE_PARAM_ATTR_KEY: z.string(),
    MIX_JS_ROUTE_PARAM_ATTR: z.string(),
  }),
})

const kuramanimeProcessSchema = z.object({
  env: z.object({
    MIX_AUTH_ROUTE_PARAM: z.string(),
    MIX_PAGE_TOKEN_KEY: z.string(),
    MIX_STREAM_SERVER_KEY: z.string(),
  }),
})

let kMIX_PAGE_TOKEN_VALUE: string | null
let kProcess: z.infer<typeof kuramanimeProcessSchema> | null
let kInitProcess: z.infer<typeof kuramanimeInitProcessSchema> | null
let kGlobalData: z.infer<typeof kuramanimeGlobalDataSchema> | null

const unsetCredentials = () => {
  kMIX_PAGE_TOKEN_VALUE = null
  kProcess = null
  kInitProcess = null
  kGlobalData = null
}

export const downloadEpisode = async (
  localAnime: Pick<typeof anime.$inferSelect, 'id' | 'title'>,
  metadata: Pick<typeof animeMetadata.$inferSelect, 'providerId' | 'providerSlug'>,
  episodeNumber: number,
  onFinish?: () => void,
): Promise<string | null> => {
  const animePath = videosDirPath + localAnime.id
  const fileName = episodeNumber.toString().padStart(2, '0') + '.mp4'
  const tempFilePath = path.join(animePath, '_' + fileName)
  const file = Bun.file(tempFilePath)

  if (await file.exists()) {
    return null
  }

  const episodeUrl = new URL('https://kuramanime.' + env.KURAMANIME_TLD)
  episodeUrl.pathname = `/anime/${metadata.providerId}/${metadata.providerSlug}/episode/${episodeNumber}`

  const emitKey = `${localAnime.title}: Episode ${episodeNumber}`

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

      return downloadEpisode(localAnime, metadata, episodeNumber, onFinish)
    }

    downloadProgress.emit(emitKey, {
      text: 'Terjadi error yang tidak diketahui. Harap cek log',
      done: true,
    })

    logger.error('Download episode: unknown error', {
      localAnime,
      metadata,
      episodeNumber,
      responseHtml,
    })

    throw new Error('unknown error')
  }

  const mkDirPromise = fs.mkdir(animePath, { recursive: true })

  downloadUrl = downloadUrl.slice(downloadUrl.indexOf('https://kuramadrive.com/kdrive/'))
  downloadUrl = downloadUrl.slice(0, downloadUrl.indexOf('"'))

  const { contentLength, stream } = await kdriveDownload(downloadUrl, kGlobalData)
  const formattedContentLength = contentLength ? formatBytes(contentLength) : null

  let receivedLength = 0

  await mkDirPromise

  const writer = file.writer({ highWaterMark: 4 * 1024 * 1024 }) // 4 MB

  ;(async () => {
    let skip = false
    const emitProgress = (data: Uint8Array) => {
      receivedLength += data.length

      if (skip) {
        return
      }

      skip = true
      let text = 'Mengunduh: ' + formatBytes(receivedLength)

      if (contentLength) {
        text +=
          ' / ' +
          formattedContentLength +
          ' (' +
          ((receivedLength / contentLength) * 100).toFixed(2) +
          '%)'
      }

      downloadProgress.emit(emitKey, { text })
    }
    const intervalId = setInterval(() => {
      skip = false
    }, 100)

    for await (const data of stream) {
      writer.write(data)

      emitProgress(data)
    }

    clearInterval(intervalId)

    downloadProgress.emit(emitKey, {
      text: `Mengunduh: ${formattedContentLength} / ${formattedContentLength} (100%)`,
    })

    await writer.end()

    downloadProgress.emit(emitKey, { text: `Mengoptimalisasi video` })

    const filePath = path.join(animePath, fileName)

    await Bun.$`ffmpeg -i ${tempFilePath} -codec copy -movflags +faststart ${filePath}`.quiet()

    downloadProgress.emit(emitKey, { text: `Video selesai diunduh`, done: true })

    await fs.rm(tempFilePath)

    onFinish?.()
  })()

  return formattedContentLength
}

function getKuramanimeInitProcess() {
  return fetchWindowJson(
    `https://kuramanime.${env.KURAMANIME_TLD}/assets/js/sizzly.js`,
    kuramanimeInitProcessSchema,
  )
}

async function getKuramanimeProcess(anyKuramanimeEpisodeUrl: string) {
  let kpsUrl = await fetchText(anyKuramanimeEpisodeUrl)
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('data-kps="'))
  kpsUrl = kpsUrl.slice(kpsUrl.indexOf('"') + 1, kpsUrl.indexOf('">'))

  if (!kpsUrl) {
    throw new EpisodeNotFoundError()
  }

  const kProcess = await fetchWindowJson(
    `https://kuramanime.${env.KURAMANIME_TLD}/assets/js/${kpsUrl}.js`,
    kuramanimeProcessSchema,
  )
  const pageToken = await fetchText(
    `https://kuramanime.${env.KURAMANIME_TLD}/assets/${kProcess.env.MIX_AUTH_ROUTE_PARAM}`,
  )

  return [pageToken, kProcess] as const
}

function getKuramanimeGlobalData() {
  return fetchWindowJson(
    'https://kuramadrive.com/api/v1/var/js/master.js',
    kuramanimeGlobalDataSchema,
  )
}
