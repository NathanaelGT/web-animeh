import { z } from 'zod'
import safeEval from 'safe-eval'
import { limitRequest } from '~s/external/limit'

export const fetchText = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.text()
}

export const fetchJson = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.json()
}

export const fetchWindowJson = async <T extends z.ZodRawShape>(
  url: string,
  schema: z.ZodObject<T>,
  init?: FetchRequestInit,
) => {
  return schema.parse(safeEval(await fetchText(url, init), { window: {} }))
}

export const fetchJsonValidate = async <T extends z.ZodRawShape>(
  url: string,
  schema: z.ZodObject<T>,
  init?: FetchRequestInit,
) => {
  return schema.parse(await fetchJson(url, init))
}
