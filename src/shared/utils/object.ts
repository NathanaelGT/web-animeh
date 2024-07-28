export const isObject = (maybeObj: unknown): maybeObj is Record<string, any> => {
  return typeof maybeObj === 'object' && maybeObj !== null
}

export const isEmpty = (obj: object) => {
  for (const _ in obj) {
    return false
  }

  return true
}
