import type { MaybePromise } from 'bun'
import ky from 'ky'
import { formatNs } from 'src/server/utils/time'

const infoPath = 'node_modules/info.json'
const info = (await Bun.file(infoPath)
  .json()
  .catch(() => ({}))) as Record<string, { v: unknown; t: number }>

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
} satisfies Record<string, { ttl: number; getter(): MaybePromise<unknown> }>

const now = Math.floor(Date.now() / 1000)

let shouldPersist = false
const values = Object.entries(sources).map(([key, { ttl, getter }]) => {
  const timestamp = info[key]?.t ?? 0
  const shouldRenew = now > timestamp + ttl

  const value = shouldRenew ? getter() : info[key]!.v

  if (shouldRenew) {
    shouldPersist = true
  }

  return [key, value, shouldRenew] as const
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

const updatedInfo = Object.fromEntries(
  values.map(([key, value]) => {
    return [key, Bun.peek(value)]
  }),
) as {
  [K in keyof typeof sources]: Awaited<ReturnType<(typeof sources)[K]['getter']>>
}

if (shouldPersist) {
  const newInfo = Object.fromEntries(
    Object.entries(updatedInfo).map(([key, value]) => {
      return [key, { v: value, t: now }]
    }),
  )

  Bun.write(infoPath, JSON.stringify(newInfo, null, 2) + '\n')
}

export { updatedInfo as info, shouldPersist as infoIsHot }
