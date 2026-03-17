import fs from 'fs/promises'
import { getRealVideoDirPath } from '~s/http-handler/video'
import { storyboardsDirPath } from '~s/utils/path'
import {
  STORYBOARD_FPS,
  STORYBOARD_FRAME_HEIGHT,
  STORYBOARD_FRAME_PERFECT_HEIGHT,
  STORYBOARD_FRAME_PERFECT_WIDTH,
  STORYBOARD_FRAME_WIDTH,
  STORYBOARD_GRID_ROWS,
  STORYBOARD_GRID_COLS,
} from '~/shared/storyboard'
import { after, before } from '~/shared/utils/string'

export const handleStoryboardRequest = async (path: string): Promise<Response> => {
  const pathArr = path.slice('storyboard/'.length).split('/') as [string, string]
  if (pathArr.length !== 2) {
    return notFound()
  }

  const storyboardResult = await getStoryboardFile(pathArr)
  if (!storyboardResult) {
    return notFound()
  }

  return new Response(Bun.file(storyboardResult))

  function notFound() {
    return new Response('Not found', { status: 404 })
  }
}

const promises = new Map<string, Promise<true | undefined>>()

const getStoryboardFile = async ([animeId, episodeNumber_gridIndex]: [string, string]) => {
  const episode = before(episodeNumber_gridIndex, '_')
  const gridIndex = after(episodeNumber_gridIndex, '_')

  const filename = animeId + '_' + episode
  const storyboardPath = storyboardsDirPath + filename + '_' + gridIndex + '.jpg'
  const storyboardPattern = storyboardsDirPath + filename + '_%03d.jpg'

  if (await Bun.file(storyboardPath).exists()) {
    return storyboardPath
  }

  const key = animeId + '/' + episode

  const sharedProcess = promises.get(key)
  if (sharedProcess) {
    if (await sharedProcess) {
      return storyboardPath
    }
    return null
  }

  let resolve: (value?: true) => void
  const promise = new Promise<true | undefined>(r => {
    resolve = r
  })

  promises.set(key, promise)

  const mkdirPromise = fs.mkdir(storyboardsDirPath, { recursive: true })
  const [videoDir] = await getRealVideoDirPath(animeId)
  if (!videoDir) {
    resolve!()
    return null
  }

  const videoPath = videoDir + episode + '.mp4'
  if (!(await Bun.file(videoPath).exists())) {
    resolve!()
    return null
  }

  await mkdirPromise

  await Bun.spawn({
    cmd: [
      'ffmpeg',
      '-v',
      'error',
      '-stats',
      '-discard',
      'nokey',
      '-i',
      videoPath,
      '-vf',
      `fps=${STORYBOARD_FPS},` +
        `scale=${STORYBOARD_FRAME_WIDTH}:${STORYBOARD_FRAME_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${STORYBOARD_FRAME_PERFECT_WIDTH}:${STORYBOARD_FRAME_PERFECT_HEIGHT}:0:0:black,` +
        `tile=${STORYBOARD_GRID_ROWS}x${STORYBOARD_GRID_COLS}`,
      '-vcodec',
      'mjpeg',
      '-q:v',
      '2',
      '-y',
      storyboardPattern,
    ],
    stderr: 'ignore',
  }).exited

  resolve!(true)

  promises.delete(key)

  return storyboardPath
}
