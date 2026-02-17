import SuperJSON from 'superjson'
import { getStackTraces } from '~s/utils/error'
import { logger, type Context } from '~s/utils/logger'

export class EpisodeNotFoundError extends Error {}

export class LeviathanSrcNotFoundError extends Error {}

export class LeviathanExecutionError extends Error {}

export class SilentError extends Error {
  protected shouldLog = true

  static from(error: any) {
    if (error instanceof this) {
      return error
    }

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : SuperJSON.stringify(error)

    return new this(message, { cause: error })
  }

  log(message: string, context: Context = {}) {
    if (this.shouldLog) {
      this.shouldLog = false

      context.error = this
      context.stacktraces = getStackTraces(this)

      logger.error(message, context)
    }

    return this
  }
}
