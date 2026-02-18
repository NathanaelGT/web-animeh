import fs from 'fs'
import { animeVideoRealDirPath as realAnimeVideoDirPath } from '~s/utils/path'
import { parseNumber } from '~/shared/utils/number'
import { downloadSizeMap } from '~s/external/download/progress'
import { withoutExtension } from '~/shared/utils/file'

export const handleVideoRequest = async (request: Request, path: string): Promise<Response> => {
  const pathArr = path.slice('videos/'.length).split('/') as [string, string]
  if (pathArr.length !== 2) {
    return notFound()
  }

  const videoFileResult = await getVideoFile(pathArr as [string, string])
  if (!videoFileResult) {
    return notFound()
  }

  const [video, videoPath, isDownloading] = videoFileResult
  const range = request.headers.get('range')
  if (!range) {
    return new Response(video)
  }

  let size = isDownloading ? downloadSizeMap.get(withoutExtension(pathArr.join(':'))) : video.size
  if (!size) {
    return notFound()
  }

  const parts = range.replace('bytes=', '').split('-')
  const start = parseNumber(parts[0]) ?? 0
  const end = Math.min(parseNumber(parts[1]) ?? Infinity, video.size - 1)

  try {
    const res = new Response(fs.createReadStream(videoPath, { start, end }), { status: 206 })

    res.headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
    res.headers.set('Accept-Ranges', 'bytes')
    res.headers.set('Content-Length', String(end - start + 1))
    res.headers.set('Content-Type', video.type)

    return res
  } catch {
    const res = new Response(null, { status: 416 })

    res.headers.set('Content-Range', `bytes */${video.size}`)
    res.headers.set('Content-Type', video.type)

    return res
  }

  function notFound() {
    return new Response('Not found', { status: 404 })
  }
}

const getVideoFile = async (
  [animeId, episodeNumber]: [string, string],
  _retry = true,
): Promise<[Bun.BunFile, string, boolean] | null> => {
  const [realVideoDirPath, videoPathIsFromCache] = await getRealVideoDirPath(animeId)
  if (!realVideoDirPath) {
    return null
  }

  const videoPath = realVideoDirPath + episodeNumber
  const video = Bun.file(videoPath)

  if (video.size === 0) {
    const downloadingVideoPath = videoPath.replace('.mp4', '_.mp4')
    const downloadingVideo = Bun.file(downloadingVideoPath)
    if (downloadingVideo.size) {
      return [downloadingVideo, downloadingVideoPath, true]
    }

    if (videoPathIsFromCache && _retry) {
      realVideoDirPathCache.delete(animeId)

      return getVideoFile([animeId, episodeNumber], false)
    }

    return null
  }

  return [video, videoPath, false]
}

const realVideoDirPathCache = new Map<string, string>()
const getRealVideoDirPath = async (animeId: string) => {
  const cache = realVideoDirPathCache.get(animeId)
  if (cache) {
    return [cache, true] as const
  }

  const result = await realAnimeVideoDirPath(animeId)
  if (result) {
    realVideoDirPathCache.set(animeId, result)
  }

  return [result, false] as const
}
