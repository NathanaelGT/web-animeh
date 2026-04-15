import fs from 'fs/promises'
import { getRealVideoDirPath } from '~s/http-handler/video'
import { iframesDirPath } from '~s/utils/path'

export const handleIframeRequest = async (path: string): Promise<Response> => {
  const pathArr = path.slice('iframe/'.length).split('/') as [string, string]
  if (pathArr.length !== 2) {
    return notFound()
  }

  const iframeResult = await getIframeFile(pathArr)
  if (!iframeResult) {
    return notFound()
  }

  return new Response(Bun.file(iframeResult))

  function notFound() {
    return new Response('Not found', { status: 404 })
  }
}

const promises = new Map<string, Promise<true | undefined>>()

const getIframeFile = async ([animeId, episodeStr]: [string, string]) => {
  const filename = animeId + '_' + episodeStr
  const iframePath = iframesDirPath + filename + '.txt'

  if (await Bun.file(iframePath).exists()) {
    return iframePath
  }

  const key = animeId + '/' + episodeStr

  const sharedProcess = promises.get(key)
  if (sharedProcess) {
    if (await sharedProcess) {
      return iframePath
    }
    return null
  }

  const { promise, resolve } = Promise.withResolvers<true | undefined>()

  promises.set(key, promise)

  const mkdirPromise = fs.mkdir(iframesDirPath, { recursive: true })
  const [videoDir] = await getRealVideoDirPath(animeId)
  if (!videoDir) {
    resolve!()
    return null
  }

  const videoPath = videoDir + episodeStr + '.mp4'
  if (!(await Bun.file(videoPath).exists())) {
    resolve!()
    return null
  }

  await mkdirPromise

  const { packets } = (await Bun.spawn({
    cmd: [
      'ffprobe',
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'packet=pts_time,flags',
      '-of',
      'json',
      videoPath,
    ],
    stderr: 'ignore',
  }).stdout.json()) as { packets: { pts_time: string; flags: string }[] }

  Bun.file(iframePath).write(
    packets
      .filter(packet => packet.flags[0] === 'K')
      .map(packet => packet.pts_time)
      .join(','),
  )

  resolve!(true)

  promises.delete(key)

  return iframePath
}
