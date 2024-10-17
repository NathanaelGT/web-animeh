import ky from 'ky'

const kuramalink = 'https://kuramalink.me/'

let cachedKuramanimeOrigin: string | undefined
/** Origin dengan trailing slash */
const getKuramanimeOrigin = async () => {
  const response = await fetch(kuramalink, { method: 'HEAD' })

  return response.url
}

const rewriteKuramalink = async (input: Parameters<typeof fetch>[0]) => {
  const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url)

  // + 1 untuk "/" diawal
  const relativeInput = url.href.slice(url.origin.length + 1)

  return (cachedKuramanimeOrigin ??= await getKuramanimeOrigin()) + relativeInput
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
