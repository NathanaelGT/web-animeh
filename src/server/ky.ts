import ky, { type KyResponse } from 'ky'
import { isOffline } from '~s/utils/error'
import { SilentError } from './error'
import { metadata } from './metadata'

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

const kuramanimeCookieStore = new Map(metadata.get('kuramanimeCookie'))

;(() => {
  const intlDateTime = new Intl.DateTimeFormat('id-ID', {
    timeZoneName: 'long',
  })

  const fullTimezone = intlDateTime
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value

  const set = (name: string, value: string) => {
    kuramanimeCookieStore.set(name, [value, Infinity])
  }

  set('should_do_galak', 'show')
  set('sel_timezone_v2', intlDateTime.resolvedOptions().timeZone)

  if (fullTimezone) {
    const short = fullTimezone
      .split(' ')
      .map(char => char[0])
      .join('')

    set('full_timezone_v2', fullTimezone)
    set('short_timezone_v2', short)
  }

  set('auto_timezone_v2', 'yes')
  set('preferred_stserver', 'kuramadrive')
})()

let syncKuramanimeCookieTimeout: NodeJS.Timeout | undefined
function storeKuramanimeCookies(response: KyResponse) {
  const now = Date.now() / 1000
  const cookies = response.headers.get('set-cookie') ?? ''

  for (const cookie of cookies.split(/,(?=\s*\w+=)/)) {
    const pairs = cookie.split('; ').map(pair => pair.split('=') as [string, string | undefined])
    const [name, value] = pairs[0]!

    if (value) {
      let expiredAt = NaN
      for (let i = 1; i < pairs.length; i++) {
        const [_attrName, attrValue] = pairs[i]!

        if (attrValue) {
          const attrName = _attrName.toLowerCase()

          if (attrName === 'expires') {
            expiredAt = Date.parse(attrValue) / 1000
            break
          } else if (attrName === 'max-age') {
            expiredAt = now + parseInt(attrValue)
            break
          }
        }
      }

      kuramanimeCookieStore.set(name.trim(), [value, expiredAt])
    }
  }

  clearTimeout(syncKuramanimeCookieTimeout)
  syncKuramanimeCookieTimeout = setTimeout(() => {
    syncKuramanimeCookieTimeout = undefined

    const now = Date.now() / 1000

    const cookie = Array.from(kuramanimeCookieStore).filter(([_name, [_value, expiredAt]]) => {
      return expiredAt > now && isFinite(expiredAt)
    })

    void metadata.set('kuramanimeCookie', cookie)
  }, 3000)
}

function getKuramanimeCookieHeader() {
  const now = Date.now() / 1000
  let cookie = ''

  for (const [name, [value, expiredAt]] of kuramanimeCookieStore) {
    if (expiredAt > now) {
      cookie += `${name}=${value}; `
    } else {
      kuramanimeCookieStore.delete(name)
    }
  }

  return cookie.slice(0, -2)
}

const chromeVersion = Bun.env.LATEST_CHROME_VERSION

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
