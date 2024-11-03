import Bun from 'bun'
import { parseArgs } from 'util'
import { isProduction } from '~s/env' with { type: 'macro' }
import { version, build, compiled } from '~s/info' with { type: 'macro' }

const parseArgv = () => {
  try {
    const argv = parseArgs({
      args: Bun.argv,
      allowPositionals: true,
      strict: false,
      options: {
        log: {
          type: 'boolean',
          default: !isProduction(),
        },
        version: {
          type: 'boolean',
          default: false,
          short: 'v',
        },
      },
    }).values

    const isFetchingVersion = argv.version

    const info = isFetchingVersion
      ? (info: string) => info
      : (info: string) => {
          return (
            ' '.repeat(Math.floor((47 - info.length) / 2)) +
            `\x1b[34m\x1b[7m${info}\x1b[0m\x1b[34m\x1b[0m`
          )
        }

    let message = info(`Web Animeh v${version()} (${build()})`)

    if (isFetchingVersion) {
      message += '\n' + info(compiled()) + '\n'
    } else {
      message = '\n' + message
    }

    process.stdout.write(message)

    if (isProduction() && isFetchingVersion) {
      process.exit(0)
    }

    return argv
  } catch (e) {
    const message = e instanceof Error ? e.message : e || 'An error occurred'

    process.stdout.write(`\x1b[31m\x1b[7mERROR\x1b[0m\x1b[31m\x1b[0m ${message}\n`)
    process.exit(1)
  }
}

const globalForArgv = globalThis as unknown as {
  argv?: ReturnType<typeof parseArgv>
}

export const argv = isProduction() ? parseArgv() : (globalForArgv.argv ??= parseArgv())
