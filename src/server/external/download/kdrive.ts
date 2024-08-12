import z from 'zod'
import { fetchText, fetchJsonValidate } from '~/shared/utils/fetch'
import { parseNumber } from '~/shared/utils/number'

export const kuramanimeGlobalDataSchema = z.object({
  tokens: z.object({
    globalBearerToken: z.string(),
  }),
})

const kdriveCheckResponseSchema = z.object({
  url: z.string().url(),
})

export async function download(
  kDriveUrl: string,
  kGlobalData: z.infer<typeof kuramanimeGlobalDataSchema>,
) {
  let domain = await fetchText(kDriveUrl)
  domain = domain.slice(domain.indexOf('data-domain="'))
  domain = domain.slice(domain.indexOf('"') + 1, domain.indexOf('" '))

  const kDriveCheckUrl = kDriveUrl.replace('kdrive', 'api/v1/drive/file') + '/check'

  const checkBody = new FormData()
  checkBody.append('domain', domain)
  checkBody.append('token', null)

  const responseJson = await fetchJsonValidate(kDriveCheckUrl, kdriveCheckResponseSchema, {
    method: 'POST',
    body: checkBody,
    headers: {
      Authorization: `Bearer ${kGlobalData.tokens.globalBearerToken}`,
    },
  })

  const response = await fetch(responseJson.url)
  const reader = (response.body as ReadableStream<Uint8Array> | null)?.getReader()
  if (!reader) {
    throw new Error('no reader')
  }

  return {
    contentLength: parseNumber(response.headers?.get('Content-Length')),
    stream: (async function* () {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        yield value
      }
    })(),
  }
}
