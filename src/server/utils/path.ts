import path from 'path'
import { isProduction } from '~s/env' with { type: 'macro' }

export const basePath = isProduction()
  ? path.join(import.meta.dir, '../')
  : path.join(import.meta.dir, '../../../')

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
