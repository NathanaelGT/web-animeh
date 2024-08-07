import { useEffect, useId, useState } from 'react'
import { getImageFromCache, onImageLoad } from '../image'

export const urlMap = new Map<string, string>()
const activePathMap = new Map<string, number>()

export const imageIsLoaded = (path: string) => activePathMap.has(path)

const incrementActivePath = (path: string) => {
  activePathMap.set(path, (activePathMap.get(path) ?? 0) + 1)
}

const decrementActivePath = (path: string, url?: string) => {
  const active = activePathMap.get(path) ?? 0
  if (active > 1) {
    activePathMap.set(path, active - 1)

    return
  }

  if (url) {
    URL.revokeObjectURL(url)
  }

  urlMap.delete(path)
  activePathMap.delete(path)
}

export const useImage = (path: string) => {
  const id = useId()

  const getInitialImageUrl = () => {
    const sharedUrl = urlMap.get(path)
    if (sharedUrl) {
      incrementActivePath(path)
      return sharedUrl
    }

    const imageBlob = getImageFromCache(path)
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob)

      urlMap.set(path, url)
      incrementActivePath(path)

      return url
    }
  }

  const [imageUrl, setImageUrl] = useState<string | undefined>(getInitialImageUrl)

  useEffect(() => {
    setImageUrl(getInitialImageUrl())

    if (!urlMap.has(path)) {
      const removeListener = onImageLoad(image => {
        if (image.path !== path) {
          return
        }

        removeListener!()

        incrementActivePath(path)
        setImageUrl(image.url)

        urlMap.set(path, image.url)
      }, id)
    }

    return () => {
      decrementActivePath(path, urlMap.get(path))
    }
  }, [path])

  return imageUrl
}
