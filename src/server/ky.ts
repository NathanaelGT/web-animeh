import ky, { type KyResponse } from 'ky'
import { kv } from './kv'

const kuramanimeCookieStore = new Map(kv.get('kuramanimeCookie'))

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

    void kv.set('kuramanimeCookie', cookie)
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

const createKuramanimeInstance = (host: string) => {
  return ky.extend({
    prefixUrl: `https://${host}/`,

    headers: {
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Bun.env.LATEST_CHROME_VERSION}.0.0.0 Safari/537.36`,
      'Sec-Ch-Ua': `"Not\\A;Brand";v="99", "Chromium";v="${Bun.env.LATEST_CHROME_VERSION}", "Google Chrome";v="${Bun.env.LATEST_CHROME_VERSION}"`,
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Ch-Ua-Platform-Version': '"14.0.0"',
      'Sec-Ch-Ua-Mobile': '?0',
    },

    hooks: {
      beforeRequest: [
        request => {
          request.headers.set('Cookie', getKuramanimeCookieHeader())
        },
      ],

      afterResponse: [
        (request, _options, response) => {
          storeKuramanimeCookies(response)

          if (request.url !== response.url) {
            const newHost = new URL(response.url).host

            kuramanime = createKuramanimeInstance(newHost)

            void kv.set('kuramanimeHost', newHost)
          }
        },
      ],
    },
  })
}

export let kuramanime = createKuramanimeInstance(kv.get('kuramanimeHost'))
