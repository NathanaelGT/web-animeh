import { z } from 'zod'
import { limitRequest } from '~s/external/limit'

export const fetchText = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.text()
}

export const fetchJson = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.json()
}

export const fetchJsonValidate = async <T extends z.ZodRawShape>(
  url: string,
  schema: z.ZodObject<T>,
  init?: FetchRequestInit,
) => {
  return schema.parse(await fetchJson(url, init))
}
