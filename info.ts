import os from 'os'
import ky from 'ky'
import { formatNs } from 'src/server/utils/time'
import { format } from 'src/shared/utils/date'

const infoPath = 'node_modules/info.json'
const info = (await Bun.file(infoPath)
  .json()
  .catch(() => ({}))) as Record<string, { v: unknown; t?: number }>

const isProd = Bun.main.endsWith('build.ts') || false

const buildNumberPromise = (async () => {
  try {
    const head = await Bun.file('.git/HEAD').text()

    if (head.indexOf(':') === -1) {
      return head.slice(0, 7)
    }

    const rev = await Bun.file('.git/' + head.slice(5).trim()).text()

    return rev.slice(0, 7)
  } catch {
    return 'unknown'
  }
})()

const sources = {
  LATEST_CHROME_VERSION: {
    ttl: 60 * 60 * 12,
    async getter() {
      const url =
        'https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Windows&num=1'

      const [{ milestone }] = await ky(url).json<[{ milestone: number }]>()

      return milestone
    },
  },
  VERSION: {
    async getter() {
      const { version } = await import('package.json')

      return version
    },
  },
  BUILD_NUMBER: {
    getter: () => buildNumberPromise,
  },
  BUILD: {
    async getter() {
      return isProd ? `build ${await buildNumberPromise}` : 'Development'
    },
  },
  COMPILED: {
    async getter() {
      const compiledAt = format(new Date())
      const compiledBy = (await gitUsername()) || os.userInfo().username

      return `Compiled at ${compiledAt} by ${compiledBy}`

      async function gitUsername() {
        try {
          const { stdout } = Bun.spawn({
            cmd: ['git', 'config', '--global', 'user.name'],
            stdout: 'pipe',
          })

          const output = await stdout.text()

          return output.trim()
        } catch {
          //
        }
      }
    },
  },
  SERVER_TYPE: {
    getter() {
      return isProd ? 'Server' : 'Dev Server'
    },
  },
} satisfies Record<string, { ttl?: number; getter(): Bun.MaybePromise<unknown> }>

const now = Math.floor(Date.now() / 1000)

let shouldPersist = false
const values = Object.entries(sources).map(([key, data]) => {
  const ttl = ((data as any).ttl as number | undefined) ?? 0
  const { getter } = data

  const timestamp = info[key]?.t ?? 0
  const shouldRenew = now > timestamp + ttl

  const value = shouldRenew ? getter() : info[key]!.v

  if (ttl && shouldRenew) {
    shouldPersist = true
  }

  return [key, value, ttl] as const
})

if (shouldPersist) {
  process.stdout.write('\n\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m Updating metadata\x1b[0m\n')
}

const start = Bun.nanoseconds()
await Promise.all(values.map(([_key, value]) => value))
const end = Bun.nanoseconds()

if (shouldPersist) {
  process.stdout.moveCursor(0, -1)
  process.stdout.clearLine(0)
  process.stdout.write(
    `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m Metadata updated \x1b[90m(${formatNs(end - start)} elapsed)\x1b[0m\n`,
  )
}

const generatedInfo: [string, string][] = []

const peekedValues = values.map(([key, value, ttl]) => {
  const peeked = Bun.peek(value)

  if (ttl === 0) {
    generatedInfo.push([key, typeof peeked])
  }

  return [key, peeked, ttl] as const
})

const updatedInfo = Object.fromEntries(peekedValues) as {
  [K in keyof typeof sources]: Awaited<ReturnType<(typeof sources)[K]['getter']>>
}

if (shouldPersist) {
  const newInfo = Object.fromEntries(
    peekedValues
      .map(([key, value, ttl]) => {
        const shouldIncludeTimestamp = (sources as any)[key].ttl !== undefined

        return ttl ? [key, { v: value, t: shouldIncludeTimestamp ? now : undefined }] : null
      })
      .filter(entry => entry !== null),
  )

  Bun.write(infoPath, JSON.stringify(newInfo))
}

const fileDTsPath = 'src/server/types/info.d.ts'
Bun.file(fileDTsPath)
  .text()
  .then(content => {
    const mark = '// Auto generated info'
    const startMark = mark + ' start'
    const endMark = mark + ' end'

    const startMarkIndex = content.indexOf(startMark)
    const endMarkIndex = content.indexOf(endMark)

    if (startMarkIndex === -1 || endMarkIndex === -1) {
      throw new Error('Could not find info markers in vite-env.d.ts')
    }

    const prefix = content.slice(0, startMarkIndex + startMark.length)
    const suffix = content.slice(endMarkIndex)

    const generated = generatedInfo
      .map(([key, type]) => {
        return `\n    ${key}: ${type}`
      })
      .join('')

    const newContent = prefix + generated + '\n    ' + suffix

    if (newContent !== content) {
      return Bun.write(fileDTsPath, newContent)
    }
  })

export { updatedInfo as info, shouldPersist as infoIsHot }
