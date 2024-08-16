import Bun from 'bun'
import path from 'path'
import fs from 'fs'
import { basePath } from '~s/utils/path'
import { parseNumber } from '~/shared/utils/number'

export const handleVideoRequest = async (request: Request, target: string): Promise<Response> => {
  const videoPath = path.join(basePath, target)
  const video = Bun.file(videoPath)

  if (video.size === 0) {
    return new Response('Not found', { status: 404 })
  }

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
