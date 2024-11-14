import { rpc } from '~c/trpc'
// @ts-ignore
import type { logger as baseLogger } from '~s/utils/logger'

const log = (
  level: keyof typeof baseLogger,
  message: string,
  context: Record<string, any> = {},
) => {
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

export const logger: typeof baseLogger = {
  info(message: string, context?: Record<string, any>) {
    log('info', message, context)
  },

  warn(message: string, context?: Record<string, any>) {
    log('warn', message, context)
  },

  error(message: string, context?: Record<string, any>) {
    log('error', message, context)
  },

  /** @deprecated debug */
  debug(message: string, context?: Record<string, any>) {
    log('debug', message, context)
  },
}
