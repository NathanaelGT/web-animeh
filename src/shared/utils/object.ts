export const isObject = (maybeObj: unknown): maybeObj is Record<string, any> => {
  return typeof maybeObj === 'object' && maybeObj !== null
}

export const isEmpty = (obj: object) => {
  for (const _ in obj) {
    return false
  }

  return true
}

export const omit = <TObj extends object, TRemove extends (keyof TObj)[]>(
  obj: TObj,
  ...propertiesToRemove: TRemove
): Omit<TObj, TRemove[number]> => {
  const newObj = {} as typeof obj

  for (const property in obj) {
    if (propertiesToRemove.includes(property)) {
      continue
    }

    newObj[property] = obj[property]
  }

  return newObj
}
