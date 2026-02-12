import ky, { type KyResponse } from 'ky'
import { isOffline } from '~s/utils/error'
import { SilentError } from './error'
import { latestChromeVersion } from '~s/info' with { type: 'macro' }

type KuramanimeOrigin = `https://${string}/`

const kuramalink = 'https://kuramalink.me/' satisfies KuramanimeOrigin

let cachedKuramanimeOrigin: KuramanimeOrigin | undefined

const getFreshKuramanimeOrigin = async () => {
  try {
    const response = await fetch(kuramalink, { method: 'HEAD', redirect: 'follow' })

    return response.url as KuramanimeOrigin
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

const kuramanimeCookieStore = new Map<string, string>()

;(() => {
  const intlDateTime = new Intl.DateTimeFormat('id-ID', {
    timeZoneName: 'long',
  })

  const fullTimezone = intlDateTime
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value

  kuramanimeCookieStore
    .set('should_do_galak', 'show')
    .set('sel_timezone_v2', intlDateTime.resolvedOptions().timeZone)

  if (fullTimezone) {
    const short = fullTimezone
      .split(' ')
      .map(char => char[0])
      .join('')

    kuramanimeCookieStore.set('full_timezone_v2', fullTimezone).set('short_timezone_v2', short)
  }

  kuramanimeCookieStore.set('auto_timezone_v2', 'yes').set('preferred_stserver', 'kuramadrive')
})()

function storeKuramanimeCookies(response: KyResponse) {
  const cookies = response.headers.get('set-cookie') ?? ''

  for (const cookie of cookies.split(/,(?=\s*\w+=)/)) {
    for (const pair of cookie.split('; ')) {
      const [name, value] = pair.split('=')

      if (name && value) {
        kuramanimeCookieStore.set(name, value)
      }
    }
  }
}

function getKuramanimeCookieHeader() {
  let cookie = ''

  for (const [name, value] of kuramanimeCookieStore.entries()) {
    cookie += `${name}=${value}; `
  }

  return cookie.slice(0, -2)
}

const chromeVersion = import.meta.env.PROD ? (latestChromeVersion() as unknown as string) : '145'

const kuramanimeHeaders = {
  'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
  'Sec-Ch-Ua': `"Not\\A;Brand";v="99", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Ch-Ua-Platform-Version': '"14.0.0"',
  'Sec-Ch-Ua-Mobile': '?0',
}

export let kuramanime = ky.extend({
  prefixUrl: kuramalink,

  headers: kuramanimeHeaders,

  hooks: {
    afterResponse: [
      (_request, _options, response) => {
        storeKuramanimeCookies(response)

        cachedKuramanimeOrigin = new URL(response.url).origin + '/'

        kuramanime = ky.extend({
          prefixUrl: cachedKuramanimeOrigin,

          headers: kuramanimeHeaders,

          hooks: {
            beforeRequest: [
              request => {
                request.headers.set('Cookie', getKuramanimeCookieHeader())
              },
            ],

            afterResponse: [
              (_request, _options, response) => {
                storeKuramanimeCookies(response)
              },
            ],
          },
        })
      },
    ],
  },
})
