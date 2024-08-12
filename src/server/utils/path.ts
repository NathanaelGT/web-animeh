import fs from 'fs/promises'
import path from 'path'
import { isProduction } from '~s/env' with { type: 'macro' }
import type { GlobScanOptions } from 'bun'

export const basePath = isProduction()
  ? path.join(import.meta.dir, '../')
  : path.join(import.meta.dir, '../../../')

export const videosDirPath = path.join(basePath, 'videos/')

export const glob = async (path: string, pattern: string, options?: GlobScanOptions) => {
  const isExists = await fs.exists(path)
  if (isExists) {
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
