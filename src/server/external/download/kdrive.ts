import z from 'zod'
import { fetchText, fetchJsonValidate } from '~/shared/utils/fetch'

export const kuramanimeGlobalDataSchema = z.object({
  tokens: z.object({
    globalBearerToken: z.string(),
  }),
})

const kdriveCheckResponseSchema = z.object({
  url: z.string().url(),
})

export const prepare = async (
  kDriveUrl: string,
  kGlobalData: z.infer<typeof kuramanimeGlobalDataSchema>,
) => {
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

  return fetch(responseJson.url)
}
