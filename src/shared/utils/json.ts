import { SilentError } from '~s/error'

export const parseFromJsObjectString = (input: string) => {
  const jsonString = input
    .replace(/[ |\n|,|{](\w+):/g, '"$1":')
    .replace(/:\s*'([^']+)'/g, ': "$1"')
    .replace(/,\s*([\}\]])/g, '$1')

  try {
    return JSON.parse(jsonString)
  } catch (error) {
    throw SilentError.from(error).log('failed to parse from js object string', { input })
  }
}
