import fs from 'fs/promises'
import { TRPCError } from '@trpc/server'
import { logger } from '~s/utils/logger'

export type Image = [imagePath: string | number, imageExtension: string]

export const readImage = (imagePath: string) => fs.readFile(imagePath, { encoding: 'base64' })

export const handleReadImageError = (error: unknown, [imagePath, imageExtension]: Image): void => {
  if (error instanceof Error) {
    if (error.name === 'ENOENT') {
      logger.warn('Image not found', {
        imagePath,
        imageExtension,
      })
    } else if (error.message === 'Illegal path') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
        cause: error,
      })
    }
  }

  logger.error('Failed to read image', {
    imagePath,
    imageExtension,
    error,
  })

  throw error
}
