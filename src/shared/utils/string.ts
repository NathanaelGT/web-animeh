export const ucFirst = (str: string) => {
  if (str === '') {
    return ''
  }

  return str[0]!.toUpperCase() + str.slice(1)
}

export const kebabCaseToTitleCase = (str: string) => {
  return str.split('-').map(ucFirst).join(' ')
}

export const before = (str: string, search: string) => {
  const untilIndex = str.indexOf(search)

  if (untilIndex > -1) {
    return str.slice(0, untilIndex)
  }

  return str
}
