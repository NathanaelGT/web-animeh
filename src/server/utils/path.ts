import fs from 'fs/promises'
import path from 'path'
import type { GlobScanOptions } from 'bun'

export const basePath = Bun.env.PROD
  ? path.join(import.meta.dir, '../')
  : path.join(import.meta.dir, '../../../')

export const imagesDirPath = basePath + 'images' + path.sep

export const videosDirPath = basePath + 'videos' + path.sep

export const glob = async (
  path: string,
  pattern: string,
  options?: Omit<GlobScanOptions, 'cwd'>,
) => {
  const isExists = await fs.exists(path)
  if (isExists) {
    if (options) {
      ;(options as GlobScanOptions).cwd = path
    }

    return Array.fromAsync(new Bun.Glob(pattern).scan(options ?? path))
  }

  return []
}

export const safePath = (basePath: string | string[], userProvidedPath: string | string[]) => {
  if (typeof basePath !== 'string') {
    basePath = path.join(...basePath)
  }
  if (typeof userProvidedPath !== 'string') {
    userProvidedPath = path.join(...userProvidedPath)
  }

  const resolvedPath = path.join(basePath, userProvidedPath)

  if (resolvedPath.startsWith(basePath)) {
    return resolvedPath
  }

  throw new Error('Illegal path')
}

export const animeVideoRealDirPath = async (animeId: string | number) => {
  // TODO: cari cara buat "fast return", dari Bun memang ga disediakan
  const [videoDirName] = await glob(videosDirPath, `{*.${animeId},${animeId}}`, {
    onlyFiles: false,
  })

  if (videoDirName) {
    return videosDirPath + videoDirName + path.sep
  }

  return null
}
