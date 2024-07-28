import fs from 'fs/promises'
import { TRPCError } from '@trpc/server'
import { logger } from '~s/utils/logger'

export const readImage = (imagePath: string) => fs.readFile(imagePath, { encoding: 'base64' })

export const handleReadImageError = (inputPath: string, error: unknown) => {
  if (error instanceof Error) {
    if (error.name === 'ENOENT') {
      logger.warn('Image not found', {
        path: inputPath,
      })

      return ''
    } else if (error.message === 'Illegal path') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
        cause: error,
      })
    }
  }

  logger.error('Failed to read image', {
    path: inputPath,
    error,
  })

  throw error
}
