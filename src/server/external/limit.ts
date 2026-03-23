import pLimit from 'p-limit'
import { env } from '~/env'

export const limitRequest = pLimit(env.PARALLEL_REQUEST_LIMIT)
