import Bun, { Glob, $ } from 'bun'
import fs from 'fs/promises'
import os from 'os'
import { format } from 'src/shared/utils/date'
import { formatNs } from 'src/server/utils/time'

// di linux, kadang portnya tetap nyangkut walau sudah distop
const killPreviousServerPromise =
  os.platform() === 'linux' ? $`fuser -k 8887/tcp`.quiet().nothrow() : Promise.resolve()

const maxWidth = 140

process.stdout.moveCursor(0, -1)
process.stdout.clearLine(0)

const client = Bun.spawn(['bunx', '--bun', 'vite', '--port', '8888'], {
  stdin: 'inherit',
  stdout: 'pipe',
  stderr: 'inherit',
  env: {
    MODE: 'development',
    NO_COLOR: '1',
  },
})
const clientStartNs = Bun.nanoseconds()
const clientStdout = client.stdout.getReader()

await killPreviousServerPromise

const server = Bun.spawn(['bun', '--hot', './src/server/index.ts', ...Bun.argv.slice(2)], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    MODE: 'development',
    BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: '1',
    ...process.env,
  },
  ipc(message) {
    if (message === 'ready') {
      log('vite', 'Starting')
    }
  },
})

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

const textDecoder = new TextDecoder()

const childProcesses = [client, server]
childProcesses.forEach(cp => {
  const type = cp === client ? 'client' : 'server'

  cp.exited.then(code => {
    process.stderr.write(logMessage(type, `Process exited with code ${code}`))

    childProcesses.forEach(otherCp => {
      if (otherCp !== cp) {
        cp.kill()
      }
    })

    process.exit(code)
  })
})

process.on('exit', () => {
  process.stderr.write('\x1b[0m')
})
;(async () => {
  const viteGlob = new Glob('vite.config.*.timestamp-*')

  for await (const viteConfig of viteGlob.scan({ absolute: true })) {
    void fs.rm(viteConfig)
  }
})()

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
