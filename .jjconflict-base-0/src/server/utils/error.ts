import { logger } from './logger'

export const getStackTraces = (error: Error) => {
  const inspect = Bun.inspect(error)

  return inspect
    .slice(inspect.lastIndexOf('^\n') + '^\n'.length, -1)
    .split('\n')
    .slice(1)
}

let shouldNotifyOfflineStatus = true
export const isOffline = (error: unknown, shouldLog = true) => {
  const isOffline =
    error instanceof Error &&
    (error.name === 'FailedToOpenSocket' || error.name === 'ConnectionRefused')

  if (shouldLog && isOffline && shouldNotifyOfflineStatus) {
    shouldNotifyOfflineStatus = false

    setTimeout(() => {
      shouldNotifyOfflineStatus = true
    }, 300)

    logger.console.warn('You are offline')
  }

  return isOffline
}
