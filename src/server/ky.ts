import ky from 'ky'
import { logger } from '~s/utils/logger'
import { isOffline } from '~s/utils/error'
import { SilentError } from './error'

type KuramanimeOrigin = `https://${string}/`

const kuramalink: KuramanimeOrigin = 'https://kuramalink.me/'

let cachedKuramanimeOrigin: KuramanimeOrigin | undefined

const getFreshKuramanimeOrigin = async () => {
  try {
    const response = await fetch(kuramalink, { method: 'HEAD', redirect: 'manual' })
    const origin = response.headers.get('location')

    if (origin) {
      return origin as KuramanimeOrigin
    }

    logger.error(`fetch ${kuramalink} failed`, { response })

    return kuramalink
  } catch (error) {
    if (isOffline(error)) {
      throw error
    }

    throw SilentError.from(error).log(`fetch ${kuramalink} failed`)
  }
}

export const getKuramanimeOrigin = async () => {
  return (cachedKuramanimeOrigin ??= await getFreshKuramanimeOrigin())
}

const rewriteKuramalink = async (input: Parameters<typeof fetch>[0]) => {
  const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url)

  // + 1 untuk "/" diawal
  const relativeInput = url.href.slice(url.origin.length + 1)

  return (await getKuramanimeOrigin()) + relativeInput
}

export const kuramanime = ky.extend({
  prefixUrl: kuramalink,

  async fetch(input, init) {
    try {
      return await fetch(await rewriteKuramalink(input), init)
    } catch (error) {
      if (error instanceof Error && error.name === 'ConnectionClosed') {
        cachedKuramanimeOrigin = undefined

        return fetch(await rewriteKuramalink(input), init)
      }

      throw error
    }
  },
})
