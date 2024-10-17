export const toSearchParamString = (searchParams: Record<string, string | number | boolean>) => {
  let result = ''

  for (const key in searchParams) {
    result += `&${key}=${searchParams[key]}`
  }

  return result.slice(1)
}
