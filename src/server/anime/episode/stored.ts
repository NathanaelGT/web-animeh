import fs from 'fs/promises'
import path from 'path'
import { videosDirPath } from '~s/utils/path'

export const downloadedPaths = fs.readdir(videosDirPath, { withFileTypes: true }).then(files => {
  const downloadedPaths = new Map<number, string>()

  for (const file of files) {
    const index = file.name.lastIndexOf('.')
    const id = Number(file.name.slice(index + 1))

    if (isFinite(id) && file.isDirectory()) {
      downloadedPaths.set(id, file.name)
    }
  }

  return downloadedPaths
})

export const animeVideoRealDirPath = async (animeId: number) => {
  const videoDirName = (await downloadedPaths).get(animeId)

  if (videoDirName) {
    return videosDirPath + videoDirName + path.sep
  }

  return null
}

export const getStoredEpisodes = async (animeId: number) => {
  const videoRealDir = await animeVideoRealDirPath(animeId)

  if (!videoRealDir) {
    return []
  }

  const episodes: string[] = []

  try {
    const files = await fs.readdir(videoRealDir, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.mp4')) {
        episodes.push(file.name)
      }
    }
  } catch {
    //
  }

  return episodes
}
