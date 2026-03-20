import PQueue from 'p-queue'
import { env } from '~/env'

export const metadataQueue = new PQueue({
  concurrency: env.PARALLEL_DOWNLOAD_LIMIT,
})

export const downloadQueue = new PQueue({
  concurrency: env.PARALLEL_DOWNLOAD_LIMIT,
})
