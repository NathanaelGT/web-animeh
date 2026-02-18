import { rpc } from '~c/trpc'
// @ts-ignore
import type { Logger, LoggerLevel, Context } from '~s/utils/logger'

const log = (level: LoggerLevel, message: string, context: Record<string, any> = {}) => {
  const stackTraces = new Error().stack
    ?.split('\n')
    .slice(3)
    .filter(caller => !caller.includes('node_modules'))
    .map(caller => {
      caller = caller
        .slice('    at '.length)
        .replace(origin + '/', '')
        .replace(/\?t=[0-9]+/, '')

      if (caller.startsWith('<anonymous>')) {
        return caller.slice(13, -1)
      }
      return caller.replace(/([a-zA-Z0-9_]+) \((.*)\)/, '$1@$2')
    })

  if (stackTraces) {
    context.client_stacktraces = stackTraces
  }

  rpc.log.mutate({ level, message, context })

  console[level](message, context)
}

const createLevelHandler = (level: LoggerLevel) => {
  return (message: string, context?: Context) => {
    log(level, message, context)
  }
}

export const logger: Pick<Logger, LoggerLevel> = {
  info: createLevelHandler('info'),
  warn: createLevelHandler('warn'),
  error: createLevelHandler('error'),
  /** @deprecated debug */
  debug: createLevelHandler('debug'),
}
