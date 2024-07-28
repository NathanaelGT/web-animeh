// import argv ditaro dipaling atas biar hasil buildnya pengecekan argv dilakukan diawal
import { argv } from '~s/argv'
import Bun from 'bun'
import SuperJSON, { type SuperJSONResult } from 'superjson'
import { websocket, httpHandler } from '~s/handler'
import { fill, maxWidth } from '~s/utils/cli'
import { formatNs } from '~s/utils/time'
import { logger } from '~s/utils/logger'
import { format } from '~/shared/utils/date'
import { isObject } from '~/shared/utils/object'
import { serverType } from '~s/info' with { type: 'macro' }
import { isProduction } from '~s/env' with { type: 'macro' }
import type { BunWSClientCtx } from 'trpc-bun-adapter'

const globalForServer = globalThis as unknown as {
  server?: Bun.Server
}

const firstTime = isProduction() || globalForServer.server === undefined
let isTerminating = false

type Level = 'server' | 'http' | 'ws' | 'route'

const logMessage = (
  level: Level,
  message: string,
  elapsedNs: number | null = null,
  context: string | null = null,
  formatContext = false,
) => {
  const date = format(new Date())
  const elapsedTime = elapsedNs ? ' ~ ' + formatNs(elapsedNs) : ''

  const dots = fill(31, message, elapsedTime, context ? context.length + 3 : 0)

  let ctx = ''
  if (context) {
    if (formatContext) {
      if (context.endsWith('..')) {
        context = context.slice(0, -2) + '\x1b[90m..'
      }
      context = context.replace(/({|}|:|,|")/g, '\x1b[90m$1\x1b[37m')
    }

    ctx = `\x1b[90m(\x1b[37m${context}\x1b[90m) `
  }

  return `\x1b[90m[${date}] ${level.padStart(6)}: \x1b[37m${message} ${ctx}\x1b[90m${dots}${elapsedTime}\x1b[0m\n`
}

const log = (...params: Parameters<typeof logMessage>) => {
  process.stdout.write(logMessage(...params))
}

const startingMessage = logMessage('server', 'Starting').slice(0, -1) // slice untuk ngehilangin newline
if (firstTime) {
  process.stdout.write('\n\n' + startingMessage)
} else {
  globalForServer.server?.stop(true)

  if (!isProduction()) {
    log('server', 'Hot Reload')
  }
}

export type WebSocketData = {
  id: string
}

const server = Bun.serve<WebSocketData & BunWSClientCtx>({
  port: isProduction() ? 8888 : 8887,
  websocket: argv.log
    ? {
        ...websocket,
        open(ws) {
          const startNs = Bun.nanoseconds()

          try {
            return websocket.open?.(ws)
          } finally {
            const elapsed = Bun.nanoseconds() - startNs

            log('ws', 'Client Connected', elapsed, ws.data.id)
          }
        },
        close(ws, code, reason) {
          const startNs = Bun.nanoseconds()

          try {
            return websocket.close?.(ws, code, reason)
          } finally {
            const elapsed = Bun.nanoseconds() - startNs
            const status = isTerminating ? 'Terminated' : 'Disconnected'

            log('ws', `Client ${status}`, elapsed, ws.data.id)
          }
        },
        message(ws, message) {
          const startNs = Bun.nanoseconds()

          try {
            return websocket.message(ws, message)
          } finally {
            const elapsed = Bun.nanoseconds() - startNs

            ;(() => {
              if (message !== '[]') {
                return
              }

              const data = JSON.parse(message.toString()) as Record<string, unknown> | null
              if (!isObject(data?.params)) {
                return
              }

              const { path, ...params } = data.params
              if (path === 'log' || typeof path !== 'string') {
                return
              }

              const isRoute = path.startsWith('route.')
              const msg = isRoute ? path.slice(6) : path
              const level = isRoute ? 'route' : 'ws'
              const maxLength = maxWidth - 53 - msg.length

              if (isObject(params.input) && 'json' in params.input) {
                try {
                  params.input = SuperJSON.deserialize(params.input as SuperJSONResult)
                } catch {
                  //
                }
              }

              let param = JSON.stringify(params)
              param = (param.length > maxLength ? param.slice(0, maxLength - 2) + '..' : param)
                // ngehilangin double quotes dari property
                .replace(/"([^"]+)":/g, '$1:')
                .replace(/\uFFFF/g, '\\"')

              const context = param ? `${ws.data.id} ${param}` : ws.data.id

              log(level, message, elapsed, context, true)
            })()
          }
        },
      }
    : websocket,

  fetch: argv.log
    ? (request, server) => {
        const startNs = Bun.nanoseconds()

        const response = httpHandler(request, server)

        if (response === undefined) {
          return
        }

        try {
          return response
        } finally {
          const elapsed = Bun.nanoseconds() - startNs
          const url = server.url.href.slice(server.url.origin.length)

          log('http', url, elapsed)
        }
      }
    : httpHandler,
})

if (!isProduction()) {
  globalForServer.server = server
}

if (firstTime) {
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception: ' + error.message, { error })

    if (isProduction()) {
      process.exit(1)
    }
  })

  process.on('unhandledRejection', reason => {
    let message = 'Unhandled Rejection'
    if (reason instanceof Error) {
      message += ': ' + reason.message
    } else if (!isProduction() && reason instanceof BuildMessage) {
      message += ': ' + reason.name + ': ' + reason.message
    }

    logger.error(message, { reason })

    if (isProduction()) {
      process.exit(1)
    }
  })

  process.on('SIGHUP', () => process.exit(129))
  process.on('SIGINT', () => process.exit(130))
  process.on('SIGTERM', () => process.exit(143))
  process.on('exit', () => {
    isTerminating = true

    // ada beberapa terminal yang ngeprint "^C" kalo ngirim SIGINT tanpa ngasih newline
    process.stdout.cursorTo(0)

    log('server', 'Terminating')

    const startNs = Bun.nanoseconds()
    server.stop(true)
    const elapsed = Bun.nanoseconds() - startNs

    log('server', 'Terminated', elapsed)

    process.stdout.write('\x1b[0m')
  })

  const elapsed = Bun.nanoseconds()

  const url = isProduction() ? server.url.href.replace(/\/$/, '') : 'http://localhost:8888'

  const messages = [
    `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m ${serverType()} running on [\x1b[37m${url}\x1b[0m]`,
    ' '.repeat(Math.floor(url.length - 5 + serverType().length) / 2) +
      '\x1b[30m\x1b[37m\x1b[40mPress Ctrl+C to stop the server\x1b[0m\x1b[30m\x1b[0m',
    '',
    startingMessage,
    logMessage('server', 'Started', elapsed),
  ].join('\n')

  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)

  if (isProduction()) {
    process.stdout.write(messages)
  } else {
    process.stdout.write(messages, () => {
      process.send?.('ready')
    })
  }
}

if (!argv.log) {
  log('server', 'Silent Mode')
}
