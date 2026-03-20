export const parseMalId = (malUrl: string) => {
  const slicedMalUrl = malUrl.slice('https://myanimelist.net/anime/'.length)

  return parseInt(slicedMalUrl)
}
