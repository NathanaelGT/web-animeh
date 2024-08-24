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

export const picker = <T extends Record<string, any>, K extends keyof T>(...keys: K[]) => {
  return (obj: T) => {
    const picked = {} as Pick<T, K>

    for (const key of keys) {
      picked[key] = obj[key]
    }

    return picked
  }
}
