import * as v from 'valibot'
import ky from 'ky'
import { fetchText, fetchJsonValidate } from '~/shared/utils/fetch'

export const kuramanimeGlobalDataSchema = v.object({
  tokens: v.object({
    globalBearerToken: v.string(),
  }),
})

const kdriveCheckResponseSchema = v.object({
  url: v.pipe(v.string(), v.url()),
})

export const prepare = async (
  kDriveUrl: string,
  kGlobalData: v.InferInput<typeof kuramanimeGlobalDataSchema>,
  signal?: AbortSignal,
) => {
  let domain = await fetchText(kDriveUrl)
  domain = domain.slice(domain.indexOf('data-domain="'))
  domain = domain.slice(domain.indexOf('"') + 1, domain.indexOf('" '))

  const kDriveCheckUrl = kDriveUrl.replace('kdrive', 'api/v1/drive/file') + '/check'

  const checkBody = new FormData()
  checkBody.append('domain', domain)
  checkBody.append('token', 'null')

  const responseJson = await fetchJsonValidate(kDriveCheckUrl, kdriveCheckResponseSchema, {
    method: 'POST',
    body: checkBody,
    signal,
    headers: {
      Authorization: `Bearer ${kGlobalData.tokens.globalBearerToken}`,
    },
  })

  return ky.get(responseJson.url, { signal })
}
