import fs from 'fs/promises'
import path from 'path'
import SuperJSON from 'superjson'
import { argv } from '~s/argv'
import { fill } from './cli'
import { basePath } from './path'
import { formatNs } from './time'
import { format } from '~/shared/utils/date'
import { isEmpty } from '~/shared/utils/object'
import type { WebSocketData } from '~s/index'

const logDir = path.join(basePath, 'logs')

void fs.mkdir(logDir, { recursive: true })

const logPath = path.join(
  logDir,
  `web-animeh.${Bun.env.BUILD_NUMBER}${Bun.env.PROD ? '' : '.dev'}.log`,
)

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
export type Context = Record<string, any> & {
  elapsedNs?: number
  client?: WebSocketData
  stacktraces?: string[]
}

const writeToConsole = (date: string, level: Level, message: string, context: Context) => {
  if (!argv.log && level !== 'ERROR') {
    return
  }

  let caller = ''
  if (!Bun.env.PROD) {
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
  const dots = fill(29, message, caller, elapsedTime)
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
  context: Context,
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

const TARGET_CONSOLE = 1
const TARGET_FILE = 2

const log = (
  level: Level,
  message: string,
  context: Context = {},
  target: number = TARGET_CONSOLE | TARGET_FILE,
  fileLogPath = logPath,
  stringifyFn = stringify,
) => {
  const stackTraces = context.stacktraces?.map(caller => {
    caller = caller.replace(basePath, '').trim()
    if (caller.startsWith('at ')) {
      caller = caller.slice('at '.length)
    }
    if (path.sep !== '/') {
      caller = caller.replaceAll(path.sep, '/')
    }

    return caller.replace(/(\.[a-zA-Z]+):/, '$1@')
  })

  if (stackTraces) {
    context.stacktraces = stackTraces
  }

  const date = now()

  if (target & TARGET_FILE) {
    void writeToFile(date, level, message, context, fileLogPath, stringifyFn)
  }

  if (target & TARGET_CONSOLE) {
    writeToConsole(date, level, message, context)
  }
}

const createLevelHandler = (level: Level, target?: number) => {
  return (message: string, context?: Context) => {
    log(level, message, context, target)
  }
}

const createDebugHandler = (target?: number) => {
  return (message: string, context?: Context) => {
    if (!Bun.env.PROD) {
      log('DEBUG', message, context, target)
    }
  }
}

export const logger = {
  info: createLevelHandler('INFO'),
  warn: createLevelHandler('WARN'),
  error: createLevelHandler('ERROR'),
  /** @deprecated debug */
  debug: createDebugHandler(),

  console: {
    info: createLevelHandler('INFO', TARGET_CONSOLE),
    warn: createLevelHandler('WARN', TARGET_CONSOLE),
    error: createLevelHandler('ERROR', TARGET_CONSOLE),
    /** @deprecated debug */
    debug: createDebugHandler(TARGET_CONSOLE),
  },

  file: {
    info: createLevelHandler('INFO', TARGET_FILE),
    warn: createLevelHandler('WARN', TARGET_FILE),
    error: createLevelHandler('ERROR', TARGET_FILE),
    /** @deprecated debug */
    debug: createDebugHandler(TARGET_FILE),
  },
}

if (!Bun.env.PROD) {
  const logPath = path.join(logDir, `web-animeh.${Bun.env.BUILD_NUMBER}.query.log`)

  // @ts-ignore internal query logging
  logger.__internal__query = (query: string, context: Context) => {
    log('QUERY' as Level, query, context, TARGET_FILE, logPath, obj => {
      return JSON.stringify(obj, undefined, 2)
    })
  }
}

export type Logger = typeof logger

export type LoggerLevel = Lowercase<Level>
