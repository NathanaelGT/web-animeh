import * as v from 'valibot'
import ky, { type Input, type KyInstance, type Options, type ResponsePromise } from 'ky'
import { limitRequest } from '~s/external/limit'
import { SilentError } from '~s/error'

type Fetcher = (url: Input, options?: Options) => ResponsePromise<unknown>

export const fetchText = async (
  url: string,
  options: Options = {},
  fetcher: Fetcher = ky,
): Promise<string> => {
  const response = await limitRequest(() => fetcher(url, options))

  return response.text()
}

export const fetchJson = async (url: string, options?: Options, fetcher?: Fetcher) => {
  const responseText = await fetchText(url, options, fetcher)

  try {
    return JSON.parse(responseText)
  } catch (error) {
    throw SilentError.from(error).log('failed to parse fetch json', {
      url,
      options,
      response: responseText,
    })
  }
}

export const fetchJsonValidate = async <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  url: string,
  schema: TSchema,
  options?: Options,
  kyInstance?: KyInstance,
) => {
  return v.parse(schema, await fetchJson(url, options, kyInstance))
}
