import fs from 'fs/promises'
import path from 'path'
import SuperJSON from 'superjson'
import { argv } from '~s/argv'
import { fill } from './cli'
import { basePath } from './path'
import { formatNs } from './time'
import { format } from '~/shared/utils/date'
import { isEmpty } from '~/shared/utils/object'
import { buildNumber } from '~s/info' with { type: 'macro' }
import { isProduction } from '~s/env' with { type: 'macro' }
import type { WebSocketData } from '../index'

const logDir = path.join(basePath, 'logs')

if (isProduction()) {
  void fs.mkdir(logDir, { recursive: true })
}

const logPath = path.join(logDir, `web-animeh.${buildNumber()}${isProduction() ? '' : '.dev'}.log`)

const now = () => format(new Date())

const stringify = (obj: Record<string, unknown>) => {
  return JSON.stringify(
    SuperJSON.serialize(obj),
    (_key, value: unknown) => {
      if (typeof value === 'string') {
        return value.replaceAll(basePath, '')
      }

      return value
    },
    2,
  )
}

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
type Context = Record<string, any> & {
  elapsedNs?: number
  client?: WebSocketData
}
type InternalContext = Context & {
  stacktraces?: string[]
}

const writeToConsole = (date: string, level: Level, message: string, context: InternalContext) => {
  if (!argv.log && level !== 'ERROR') {
    return
  }

  let caller = ''
  if (!isProduction()) {
    let realCaller: string | undefined
    if (Array.isArray(context.client_stacktraces)) {
      realCaller = String(context.client_stacktraces[0])
    }
    realCaller ??= context.stacktraces?.[0]

    if (realCaller) {
      caller = ' ' + realCaller
    }
  }

  const elapsedTime = context.elapsedNs ? ' ~ ' + formatNs(context.elapsedNs) : ''
  const dots = fill(31, message, caller, elapsedTime)
  const levelColor = (
    {
      INFO: '\x1b[34m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      DEBUG: '\x1b[35m',
    } satisfies { [K in Level]: `\x1b[${string}m` }
  )[level]

  process.stdout.write(
    `\x1b[90m[${date}] \x1b[1m${levelColor}${level.padStart(6)}\x1b[0m\x1b[90m: \x1b[37m${message} \x1b[90m${dots}${caller}${elapsedTime}\x1b[0m\n`,
  )
}

const writeToFile = async (
  date: string,
  level: Level,
  message: string,
  context: InternalContext,
  logPath: string,
  stringify: (obj: Record<string, unknown>) => string,
) => {
  const suffix = isEmpty(context) ? '' : ' ' + stringify(context)
  const text = `[${date}] ${level}: ${message}${suffix}\n`
  const startWrite = Bun.nanoseconds()

  try {
    await fs.appendFile(logPath, text)
  } catch (error) {
    const elapsedNs = Bun.nanoseconds() - startWrite

    writeToConsole(now(), 'ERROR', 'Failed to write to log file', {
      elapsedNs,
      error,
    })
  }
}

const log = (
  level: Level,
  message: string,
  context: Context = {},
  fileLogPath = logPath,
  stringifyFn = stringify,
) => {
  const stackTraces = new Error().stack
    ?.split('\n')
    .slice(3)
    .filter(caller => {
      if (isProduction()) {
        return !caller.includes('moduleEvaluation')
      }

      return !caller.includes('moduleEvaluation') && !caller.includes('node_modules')
    })
    .map(caller => {
      caller = caller.slice('    at '.length).replaceAll(basePath, '').replaceAll(path.sep, '/')

      if (caller.startsWith('<anonymous>')) {
        return caller.slice(13, -1)
      }

      return caller.replace(/([a-zA-Z0-9_]+) \((.*)\)/, '$1@$2')
    })

  if (stackTraces) {
    if (stackTraces.at(-1)?.startsWith('processTicksAndRejections')) {
      context.stacktraces = stackTraces.slice(0, -1)
    } else {
      context.stacktraces = stackTraces
    }
  }

  const date = now()

  void writeToFile(date, level, message, context, fileLogPath, stringifyFn)

  // @ts-ignore internal query logging
  if (!isProduction() && level === 'QUERY') {
    return
  }
  writeToConsole(date, level, message, context)
}

export const logger = {
  info(message: string, context?: Context) {
    log('INFO', message, context)
  },

  warn(message: string, context?: Context) {
    log('WARN', message, context)
  },

  error(message: string, context?: Context) {
    log('ERROR', message, context)
  },

  /** @deprecated debug */
  debug(message: string, context?: Context) {
    if (!isProduction()) {
      log('DEBUG', message, context)
    }
  },
}

if (!isProduction()) {
  const logPath = path.join(logDir, `web-animeh.${buildNumber()}.query.log`)

  // @ts-ignore internal query logging
  logger.__internal__query = (query: string, context: Context) => {
    log('QUERY' as Level, query, context, logPath, obj => {
      return JSON.stringify(obj, undefined, 2)
    })
  }
}
