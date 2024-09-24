import { transformResult } from '@trpc/server/unstable-core-do-not-import'
import SuperJSON from 'superjson'
import { wsClient } from '~c/trpc'
import { imageIsLoaded, urlMap } from '~c/hooks/useImage'
import { base64ToBlob } from '~c/utils'
import type { ImageSubscriptionProcedure } from '~s/trpc-procedures/image'
import type { TRPCResponse } from '~/shared/utils/types'

const imageCache = new Map<string, Blob>()

const preloadImage = (url: string) => {
  const image = new Image()

  image.src = url
}

export const getImageFromCache = (path: string) => imageCache.get(path)

const loadImageFromCache = (path: string) => {
  if (imageIsLoaded(path)) {
    return
  }

  let url = urlMap.get(path)
  if (url === undefined) {
    const imageBlob = imageCache.get(path)
    if (imageBlob === undefined) {
      return
    }

    url = URL.createObjectURL(imageBlob)

    urlMap.set(path, url)
  }

  preloadImage(url)
}

type ImageLoadListener = (image: { path: string; url: string; blob: Blob }) => void
const imageLoadListeners = new Set<ImageLoadListener>()
const imageLoadListenerIdentifiers = new Set<string>()

const cacheImage = async (path: string, base64: string, type = 'image/webp') => {
  const blob = await base64ToBlob(base64, type)

  if (blob) {
    const url = URL.createObjectURL(blob)

    preloadImage(url)

    imageCache.set(path, blob)
    urlMap.set(path, url)

    for (const listener of imageLoadListeners) {
      listener({ path, url, blob })
    }
  }

  return blob
}

function onImageLoad(callback: ImageLoadListener): () => void
function onImageLoad(callback: ImageLoadListener, identifier: string): (() => void) | undefined
function onImageLoad(callback: ImageLoadListener, identifier?: string) {
  if (identifier) {
    if (imageLoadListenerIdentifiers.has(identifier)) {
      return
    }

    imageLoadListenerIdentifiers.add(identifier)
  }

  imageLoadListeners.add(callback)

  return () => {
    if (identifier) {
      imageLoadListenerIdentifiers.delete(identifier)
    }

    imageLoadListeners.delete(callback)
  }
}

export { onImageLoad }

wsClient.request({
  lastEventId: undefined,
  op: {
    type: 'subscription',
    path: 'images',
    id: 'images' as unknown as number,
    input: '',
    context: {},
    signal: null,
  },
  callbacks: {
    complete() {},
    error() {},
    next(message) {
      const transformed = transformResult(message, SuperJSON)

      if (!transformed.ok) {
        // ?

        return
      }

      if (transformed.result.type !== 'data') {
        return
      }

      const images = transformed.result.data as TRPCResponse<typeof ImageSubscriptionProcedure>

      for (const image of images) {
        if (typeof image === 'string') {
          loadImageFromCache(image)
        } else {
          void cacheImage(...image)
        }
      }
    },
  },
})
