import SuperJSON from 'superjson'
import { wsClient } from '../trpc'
import type { logger as baseLogger } from '~s/utils/logger'

let logId = 0

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

  wsClient.request(
    {
      type: 'mutation',
      path: 'log',
      id: ('log' + ++logId) as unknown as number,
      input: SuperJSON.serialize({ level, message, context }),
      context: {},
      signal: null,
    },
    {
      complete() {},
      error() {},
      next() {},
    },
  )

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
