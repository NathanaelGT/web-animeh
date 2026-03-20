const mimeCache = new Map<string, string>()

export const getMimeType = (extension: string) => {
  let result = mimeCache.get(extension)
  if (result) {
    return result
  }

  result = Bun.file('x.' + extension).type

  mimeCache.set(extension, result)

  return result
}
