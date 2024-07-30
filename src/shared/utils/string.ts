export const ucFirst = (str: string) => {
  if (str === '') {
    return
  }

  return str[0]!.toUpperCase() + str.slice(1)
}

export const kebabCaseToTitleCase = (str: string) => {
  return str.split('-').map(ucFirst).join(' ')
}
