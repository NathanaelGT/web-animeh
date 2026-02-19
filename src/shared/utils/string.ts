export const ucFirst = (str: string) => {
  if (str === '') {
    return ''
  }

  return str[0]!.toUpperCase() + str.slice(1)
}

export const kebabCaseToTitleCase = (str: string) => {
  return str.split('-').map(ucFirst).join(' ')
}

export const before = (str: string, search: string, fallback = str) => {
  const untilIndex = str.indexOf(search)

  if (untilIndex === -1) {
    return fallback
  }

  return str.slice(0, untilIndex)
}

export const after = (str: string, search: string, fallback = str) => {
  const fromIndex = str.indexOf(search)

  if (fromIndex === -1) {
    return fallback
  }

  return str.slice(fromIndex + search.length)
}

export const between = (str: string, start: string, end: string, fallback = str) => {
  const startIndex = str.indexOf(start)
  const endIndex = str.indexOf(end, startIndex + start.length)

  if (startIndex === -1 || endIndex === -1) {
    return fallback
  }

  return str.slice(startIndex + start.length, endIndex)
}
