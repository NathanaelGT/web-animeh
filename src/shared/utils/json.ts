export const parseFromJsObjectString = (input: string) => {
  const jsonString = input
    .replace(/[ |\n|,|{](\w+):/g, '"$1":')
    .replace(/:\s*'([^']+)'/g, ': "$1"')
    .replace(/,\s*([\}\]])/g, '$1')

  return JSON.parse(jsonString)
}
