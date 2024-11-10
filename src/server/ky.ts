import ky from 'ky'

type KuramanimeOrigin = `https://${string}/`

const kuramalink: KuramanimeOrigin = 'https://kuramalink.me/'

let cachedKuramanimeOrigin: KuramanimeOrigin | undefined

const getFreshKuramanimeOrigin = async () => {
  const response = await fetch(kuramalink, { method: 'HEAD' })

  return response.url as KuramanimeOrigin
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
