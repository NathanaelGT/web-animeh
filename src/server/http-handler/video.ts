import Bun from 'bun'
import path from 'path'
import fs from 'fs'
import { basePath } from '../utils/path'
import { parseNumber } from '~/shared/utils/number'

export const handleVideoRequest = async (request: Request, target: string): Promise<Response> => {
  const videoPath = path.join(basePath, target)

  const fileSize = await getFileSize(videoPath)
  if (fileSize === null) {
    return new Response('Not found', { status: 404 })
  }

  if (!request.headers.has('range')) {
    return new Response(Bun.file(videoPath))
  }

  const parts = request.headers.get('range')!.replace('bytes=', '').split('-')
  const start = parseNumber(parts[0]) || 0
  const end = parseNumber(parts[1]) || fileSize - 1

  const res = new Response(fs.createReadStream(videoPath, { start, end }), { status: 206 })

  res.headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
  res.headers.set('Accept-Ranges', 'bytes')
  res.headers.set('Content-Length', String(end - start + 1))
  res.headers.set('Content-Type', 'video/mp4')

  return res
}

const getFileSize = async (path: string): Promise<number | null> => {
  try {
    const stat = await fs.promises.stat(path)

    return stat.size
  } catch {
    return null
  }
}
