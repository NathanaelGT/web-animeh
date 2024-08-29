import * as v from 'valibot'
import { limitRequest } from '~s/external/limit'
import { logger } from '~s/utils/logger'
import { SilentError } from '~s/error'

export const fetchText = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))

  return response.text()
}

export const fetchJson = async (url: string, init?: FetchRequestInit) => {
  const response = await limitRequest(() => fetch(url, init))
  const responseText = await response.text()

  try {
    return JSON.parse(responseText)
  } catch (error) {
    logger.error('failed to parse fetch json', { url, init, responseText, error })

    throw SilentError.from(error)
  }
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
