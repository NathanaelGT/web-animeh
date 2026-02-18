import fs from 'fs/promises'
import os from 'os'
import Bun, { Glob, $ } from 'bun'
import { formatNs } from 'src/server/utils/time'
import { format } from 'src/shared/utils/date'
import { timeout } from 'src/shared/utils/promise'

const serverOnly = Bun.argv.includes('--server-only')

const promises: (Promise<unknown> | $.ShellPromise)[] = [
  (async () => {
    if (!(await Bun.file('.env').exists())) {
      await Bun.write('.env', Bun.file('.env.example'))
    }
  })(),
]

// di linux, kadang portnya tetap nyangkut walau sudah distop
if (os.platform() === 'linux') {
  const port = serverOnly ? 8888 : 8887

  promises.push(timeout($`fuser -k ${port}/tcp`.quiet().nothrow(), 1000))
}

const maxWidth = 140

process.stdout.moveCursor(0, -1)
process.stdout.clearLine(0)
process.env.MODE = 'development'

const client = serverOnly
  ? null
  : Bun.spawn(['bunx', '--bun', 'vite', '--port', '8888'], {
      stdin: 'inherit',
      stdout: 'pipe',
      stderr: 'inherit',
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
    })
const clientStartNs = Bun.nanoseconds()
const clientStdout = client?.stdout.getReader()

const { info } = await import('info.ts')

await Promise.all(promises)

const server = Bun.spawn(
  [
    'bun',
    '--hot',
    '--define',
    'Bun.env.PROD=false',
    '--define',
    'import.meta.env.PROD=false',
    ...Object.entries(info).flatMap(([key, value]) => [
      '--define',
      `Bun.env.${key}=` +
        (typeof value === 'string'
          ? JSON.stringify(value)
          : typeof value === 'boolean'
            ? value
              ? 'true'
              : 'false'
            : String(value)),
    ]),
    './src/server/index.ts',
    ...Bun.argv.slice(2),
  ],
  {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: '1',
    },
    ipc(message) {
      if (message === 'ready' && clientStdout) {
        log('vite', 'Starting')
      }
    },
  },
)

const fill = (minus: string | number = 0, ...args: string[]) => {
  if (typeof minus === 'string') {
    minus = minus.length
  }

  for (const arg of args) {
    minus += arg.length
  }

  const columns = process.stdout.columns ? Math.min(process.stdout.columns, maxWidth) : 30

  return '.'.repeat(Math.max(columns - minus, 2))
}

type Level = 'server' | 'client' | 'reload' | 'vite' | 'hmr'

const logMessage = (level: Level, message: string, elapsed: number | null = null) => {
  const date = format(new Date())
  const elapsedTime = elapsed ? ' ~ ' + formatNs(elapsed) : ''
  const dots = fill(31, message, elapsedTime)
  const formattedMessage = message.replaceAll(',', '\x1b[90m,\x1b[37m')

  return `\x1b[90m[${date}] ${level.padStart(6)}: \x1b[37m${formattedMessage} \x1b[90m${dots}${elapsedTime}\x1b[0m\n`
}

const log = (level: Level, message: string, elapsed: number | null = null) => {
  process.stdout.write(logMessage(level, message, elapsed))
}

let shouldPrintExitCode = true
const childProcesses = client ? [client, server] : [server]
childProcesses.forEach(cp => {
  const type = cp === server ? 'server' : 'client'

  cp.exited.then(code => {
    if (shouldPrintExitCode) {
      process.stderr.write(logMessage(type, `Process exited with code ${code}`))
    }

    childProcesses.forEach(otherCp => {
      if (otherCp !== cp) {
        cp.kill()
      }
    })

    const exitCode = [129, 130, 143].includes(code) ? 0 : code

    process.exit(exitCode)
  })
})

const handleExitCode = (exitCode: NodeJS.Signals) => {
  process.on(exitCode, () => {
    shouldPrintExitCode = false

    server.kill(exitCode)
  })
}

handleExitCode('SIGHUP')
handleExitCode('SIGINT')
handleExitCode('SIGTERM')

process.on('exit', () => {
  process.stderr.write('\x1b[0m')
})
;(async () => {
  const viteGlob = new Glob('vite.config.*.timestamp-*')

  for await (const viteConfig of viteGlob.scan({ absolute: true })) {
    void fs.rm(viteConfig)
  }
})()

if (clientStdout) {
  const textDecoder = new TextDecoder()

  let regeneratingRoutesStartNs: number | null = null

  while (true) {
    const { done, value } = await clientStdout.read()
    if (done) {
      break
    }

    const messageArrivedAt = Bun.nanoseconds()

    const message = textDecoder.decode(value).trim()

    if (message === '') {
      continue
    }

    if (message === '♻️  Regenerating routes...') {
      regeneratingRoutesStartNs = Bun.nanoseconds()

      continue
    }

    const hmrUpdateIndex = message.indexOf('[vite] hmr update ')
    if (hmrUpdateIndex > -1) {
      const files = message.slice(hmrUpdateIndex + 18).replaceAll('/src/', '')

      let elapsedNs: number | null = null

      if (regeneratingRoutesStartNs) {
        elapsedNs = messageArrivedAt - regeneratingRoutesStartNs
        regeneratingRoutesStartNs = null
      }

      log('hmr', files, elapsedNs)

      continue
    }

    const pageReloadIndex = message.indexOf('[vite] page reload ')
    if (pageReloadIndex > -1) {
      const files = message.slice(pageReloadIndex + 19).replaceAll('/src/', '')

      log('reload', files)

      continue
    }

    if (message.includes('  ready in ')) {
      log('vite', 'Started', Bun.nanoseconds() - clientStartNs)

      continue
    }
  }
}
