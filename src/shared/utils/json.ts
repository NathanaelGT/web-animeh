import { logger } from '~s/utils/logger'
import { SilentError } from '~s/error'

export const parseFromJsObjectString = (input: string) => {
  const jsonString = input
    .replace(/[ |\n|,|{](\w+):/g, '"$1":')
    .replace(/:\s*'([^']+)'/g, ': "$1"')
    .replace(/,\s*([\}\]])/g, '$1')

  try {
    return JSON.parse(jsonString)
  } catch (error) {
    logger.error('failed to parse from js object string', { error, input })

    throw SilentError.from(error)
  }
}
