import Bun from 'bun'
import fs from 'fs'
import { animeVideoRealDirPath as realAnimeVideoDirPath } from '~s/utils/path'
import { parseNumber } from '~/shared/utils/number'

export const handleVideoRequest = async (request: Request, path: string): Promise<Response> => {
  const pathArr = path.slice('videos/'.length).split('/')
  if (pathArr.length !== 2) {
    return new Response('Not found', { status: 404 })
  }

  const videoFileResult = await getVideoFile(pathArr as [string, string])
  if (!videoFileResult) {
    return new Response('Not found', { status: 404 })
  }

  const [video, videoPath] = videoFileResult
  const range = request.headers.get('range')
  if (!range) {
    return new Response(video)
  }

  const parts = range.replace('bytes=', '').split('-')
  const start = parseNumber(parts[0]) ?? 0
  const end = parseNumber(parts[1]) ?? video.size - 1

  const res = new Response(fs.createReadStream(videoPath, { start, end }), { status: 206 })

  res.headers.set('Content-Range', `bytes ${start}-${end}/${video.size}`)
  res.headers.set('Accept-Ranges', 'bytes')
  res.headers.set('Content-Length', String(end - start + 1))
  res.headers.set('Content-Type', video.type)

  return res
}

const getVideoFile = async ([animeId, episodeNumber]: [string, string], _retry = true) => {
  const [realVideoDirPath, videoPathIsFromCache] = await getRealVideoDirPath(animeId)
  if (!realVideoDirPath) {
    return null
  }

  const videoPath = realVideoDirPath + episodeNumber
  const video = Bun.file(videoPath)

  if (video.size === 0) {
    if (videoPathIsFromCache && _retry) {
      realVideoDirPathCache.delete(animeId)

      return getVideoFile([animeId, episodeNumber], false)
    }

    return null
  }

  return [video, videoPath] as const
}

const realVideoDirPathCache = new Map<string, string>()
const getRealVideoDirPath = async (animeId: string) => {
  const cache = realVideoDirPathCache.get(animeId)
  if (cache) {
    return [cache, true]
  }

  const result = await realAnimeVideoDirPath(animeId)
  if (result) {
    realVideoDirPathCache.set(animeId, result)
  }

  return [result, false]
}
