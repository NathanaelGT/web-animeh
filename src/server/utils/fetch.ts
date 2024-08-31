import * as v from 'valibot'
import ky, { type KyInstance, type Input, type Options } from 'ky'
import { limitRequest } from '~s/external/limit'
import { logger } from '~s/utils/logger'
import { SilentError } from '~s/error'

export const fetchText = async (url: Input, options: Options = {}, kyInstance = ky) => {
  const response = await limitRequest(() => kyInstance(url, options))

  return response.text()
}

export const fetchJson = async (url: Input, options?: Options, kyInstance?: KyInstance) => {
  const responseText = await fetchText(url, options, kyInstance)

  try {
    return JSON.parse(responseText)
  } catch (error) {
    logger.error('failed to parse fetch json', { url, options, response: responseText, error })

    throw SilentError.from(error)
  }
}

export const fetchJsonValidate = async <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  url: Input,
  schema: TSchema,
  options?: Options,
  kyInstance?: KyInstance,
) => {
  return v.parse(schema, await fetchJson(url, options, kyInstance))
}