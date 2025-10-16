import { glob, videosDirPath } from "~/server/utils/path"

export const getFreshStoredAnimeIds = async () => {
  return (await glob(videosDirPath, '*', { onlyFiles: false }))
    .map(dirName => {
      const index = dirName.lastIndexOf('.')
      const id = dirName.slice(index + 1)

      return Number(id)
    })
    .filter(isFinite)
}

let cache: Awaited<ReturnType<typeof getFreshStoredAnimeIds>> | null
let pending: ReturnType<typeof getFreshStoredAnimeIds> | null
export const getStoredAnimeIds = async () => {
  if (cache) {
    return cache
  }
  if (pending) {
    return pending
  }

  pending = getFreshStoredAnimeIds()

  try {
    cache = await pending

    setTimeout(() => {
      cache = null
    }, 2500)

    return cache
  } finally {
    pending = null
  }
}

export const purgeStoredCache = () => {
  cache = null
}
