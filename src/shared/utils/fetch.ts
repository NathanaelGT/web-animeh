import * as v from 'valibot'
import { limitRequest } from '~s/external/limit'

export const fetchText = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.text()
}

export const fetchJson = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.json()
}

export const fetchJsonValidate = async <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  url: string,
  schema: TSchema,
  init?: FetchRequestInit,
) => {
  return v.parse(schema, await fetchJson(url, init))
}
