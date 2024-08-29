import SuperJSON from 'superjson'

export class EpisodeNotFoundError extends Error {}

export class SilentError extends Error {
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
}
