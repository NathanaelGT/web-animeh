// import argv ditaro dipaling atas biar hasil buildnya pengecekan argv dilakukan diawal
import { argv } from '~s/argv'
import os from 'os'
import readline from 'readline'
import Bun from 'bun'
import SuperJSON, { type SuperJSONResult } from 'superjson'
import { websocket, httpHandler } from '~s/handler'
import { fill, maxWidth } from '~s/utils/cli'
import { formatNs } from '~s/utils/time'
import { logger } from '~s/utils/logger'
import { getStackTraces, isOffline } from '~s/utils/error'
import { seed } from '~s/anime/seed'
import { SilentError } from '~s/error'
import { optimizeDatabase } from './db'
import { format } from '~/shared/utils/date'
import { isObject, omit } from '~/shared/utils/object'
import { timeout } from '~/shared/utils/promise'
import { serverType } from '~s/info' with { type: 'macro' }
import { isProduction } from '~s/env' with { type: 'macro' }
import type { BunWSClientCtx } from 'trpc-bun-adapter'
import type { Profile } from '~s/db/schema'

const globalForServer = globalThis as unknown as {
  server?: Bun.Server
}

const firstTime = isProduction() || globalForServer.server === undefined
let isShuttingdown = false

type Level = 'server' | 'http' | 'ws' | 'route'

const logMessage = (
  level: Level,
  message: string,
  elapsedNs: number | null = null,
  context: string | null = null,
  formatContextRegex: RegExp | null = null,
  contextBraces: [string, string] = ['(', ')'],
) => {
  const date = format(new Date())
  const elapsedTime = elapsedNs ? ' ~ ' + formatNs(elapsedNs) : ''

  const dots = fill(
    29,
    message,
    elapsedTime,
    context ? context.length + 1 + contextBraces[0].length + contextBraces[1].length : 0,
  )

  let ctx = ''
  if (context) {
    if (formatContextRegex) {
      if (context.endsWith('..')) {
        context = context.slice(0, -2) + '\x1b[90m..'
      }
      context = context.replace(formatContextRegex, '\x1b[90m$1\x1b[37m')
    }

    ctx = `\x1b[90m${contextBraces[0]}\x1b[37m${context}\x1b[90m${contextBraces[1]} `
  }

  return `\x1b[90m[${date}] ${level.padStart(6)}: \x1b[37m${message} ${ctx}\x1b[90m${dots}${elapsedTime}\x1b[0m\n`
}

const log = (...params: Parameters<typeof logMessage>) => {
  process.stdout.write(logMessage(...params))
}

const startingMessage = logMessage('server', 'Starting')
if (firstTime) {
  process.stdout.write('\n\n' + startingMessage)
} else {
  globalForServer.server?.stop(true)

  if (!isProduction()) {
    log('server', 'Hot reload')
  }
}

export type WebSocketData = {
  id: string
  profile: Profile
}

const server = await (async () => {
  const serverOption: Bun.Serve<WebSocketData & BunWSClientCtx> = {
    port: isProduction() || Bun.argv.includes('--server-only') ? 8888 : 8887,
    websocket: argv.log
      ? {
          ...websocket,
          open(ws) {
            const startNs = Bun.nanoseconds()

            try {
              return websocket.open?.(ws)
            } finally {
              const elapsed = Bun.nanoseconds() - startNs

              log('ws', 'Client connected', elapsed, ws.data.id)
            }
          },
          close(ws, code, reason) {
            const startNs = Bun.nanoseconds()

            try {
              return websocket.close?.(ws, code, reason)
            } finally {
              const elapsed = Bun.nanoseconds() - startNs
              const suffix = isShuttingdown ? ' by server' : ''

              log('ws', `Client disconnected${suffix}`, elapsed, ws.data.id)
            }
          },
          message(ws, message) {
            const startNs = Bun.nanoseconds()

            try {
              return websocket.message(ws, message)
            } finally {
              const elapsed = Bun.nanoseconds() - startNs

              ;(() => {
                message = message.toString()
                if (message === '[]') {
                  return
                }

                const data = JSON.parse(message) as Record<string, unknown> | null
                if (!isObject(data?.params)) {
                  return
                }

                const { path } = data.params
                if (path === 'log' || typeof path !== 'string') {
                  return
                }

                const params = omit(data.params, 'path')
                if (isObject(params.input) && 'json' in params.input) {
                  try {
                    params.input = SuperJSON.deserialize(params.input as SuperJSONResult)
                  } catch {
                    //
                  }
                }

                const isRoute = path.startsWith('route.')
                const msg = isRoute ? path.slice(6) : path
                const level = isRoute ? 'route' : 'ws'
                const maxLength = maxWidth - 53 - msg.length

                let param = JSON.stringify(params)
                param = (param.length > maxLength ? param.slice(0, maxLength - 2) + '..' : param)
                  // ngehilangin double quotes dari property
                  .replace(/"([^"]+)":/g, '$1:')
                  .replace(/\uFFFF/g, '\\"')

                const context = param ? `${ws.data.id} ${param}` : ws.data.id

                log(level, msg, elapsed, context, /({|}|:|,|")/g)
              })()
            }
          },
        }
      : websocket,

    fetch: argv.log
      ? async (request, server) => {
          const startNs = Bun.nanoseconds()

          const response = await httpHandler(request, server)

          if (response === undefined) {
            return
          }

          try {
            return response
          } finally {
            const elapsed = Bun.nanoseconds() - startNs
            const url = request.url.slice(server.url.origin.length)
            const range = request.headers.get('range')
            const context = range ? range.replace('bytes=', '') : null

            log('http', url, elapsed, context, /(-)/g, ['{', '}'])
          }
        }
      : httpHandler,
  }

  try {
    return Bun.serve(serverOption)
  } catch (error) {
    let message: string

    if (error instanceof Error) {
      if (error.name === 'EADDRINUSE') {
        message = `Port ${serverOption.port} in use`
      } else {
        message = error.message
      }
    } else if (typeof error === 'string') {
      message = error
    } else {
      message = JSON.stringify(error)
    }

    process.stdout.write('\n')

    log('server', `Failed to start: ${message}`)

    process.exit(1)
  }
})()

if (!isProduction()) {
  globalForServer.server = server
}

if (firstTime) {
  process.on('uncaughtException', error => {
    if (error instanceof SilentError) {
      return
    }

    logger.error('Uncaught Exception: ' + error.message, {
      error,
      stacktraces: getStackTraces(error),
    })
  })

  process.on('unhandledRejection', reason => {
    if (reason instanceof SilentError || isOffline(reason)) {
      return
    }

    const context: NonNullable<Parameters<typeof logger.error>[1]> = { reason }

    let message = 'Unhandled Rejection'
    if (reason instanceof Error) {
      context.stacktraces = getStackTraces(reason)

      message += ': ' + reason.message
    } else if (!isProduction() && reason instanceof BuildMessage) {
      message += ': ' + reason.name + ': ' + reason.message
    }

    logger.error(message, context)
  })

  const [createShutdownHandler, forceShutdown] = (() => {
    let startNs: number | undefined
    let stoppedLogged = false

    const start = () => {
      isShuttingdown = true

      // ada beberapa terminal yang ngeprint "^C" kalo ngirim SIGINT tanpa ngasih newline
      process.stdout.cursorTo(0)

      log('server', 'Stopping', null, 'press Ctrl+C again to force stop the server', /(.)/g, [
        '',
        '',
      ])

      startNs = Bun.nanoseconds()
    }

    const logElapsed = (message = 'Terminated') => {
      if (stoppedLogged) {
        return
      }

      stoppedLogged = true

      const elapsed = Bun.nanoseconds() - startNs!

      // ada beberapa terminal yang ngeprint "^C" kalo ngirim SIGINT tanpa ngasih newline
      process.stdout.cursorTo(0)

      process.stdout.write(logMessage('server', message, elapsed) + '\x1b[0m')
    }

    return [
      (exitCode: number) => async () => {
        if (startNs === undefined) {
          start()

          const stopPromise = server.stop(true)

          await timeout(stopPromise, 1000)

          optimizeDatabase()

          await stopPromise

          logElapsed('Stopped')
        } else {
          optimizeDatabase()

          logElapsed()
        }

        process.exit(exitCode)
      },

      () => {
        if (startNs === undefined) {
          start()

          server.stop(true)
        }

        logElapsed()
      },
    ] as const
  })()

  process.on('SIGHUP', createShutdownHandler(129))
  process.on('SIGINT', createShutdownHandler(130))
  process.on('SIGTERM', createShutdownHandler(143))
  process.on('exit', forceShutdown)

  const elapsed = Bun.nanoseconds()

  const messages = Object.values(os.networkInterfaces()).reduce<string[]>(
    (r, list) => {
      if (!list) {
        return r
      }

      return r.concat(
        list.reduce<string[]>((rr, i) => {
          if (i.family === 'IPv4' && !i.internal && i.address) {
            rr.push(
              ' '.repeat(19 + serverType().length) +
                `\x1b[0m[\x1b[37mhttp://${i.address}:8888\x1b[0m]`,
            )
          }
          return rr
        }, []),
      )
    },
    [
      `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m ${serverType()} running on [\x1b[37mhttp://localhost:8888\x1b[0m]`,
    ],
  )

  messages.push(
    '',
    '\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m \x1b[30m\x1b[37m\x1b[40mPress Ctrl+C to stop the server\x1b[0m\x1b[30m\x1b[0m',
    '',
    startingMessage.slice(0, -1), // slice untuk ngehilangin newline
    logMessage('server', 'Started', elapsed),
  )

  readline.moveCursor(process.stdout, 0, -1)
  process.stdout.cursorTo(0)
  process.stdout.clearLine(0)

  if (isProduction()) {
    process.stdout.write(messages.join('\n'))
  } else {
    process.stdout.write(messages.join('\n'), () => {
      process.send?.('ready')
    })
  }

  seed()
}

if (!argv.log) {
  log('server', 'Silent mode')
}
