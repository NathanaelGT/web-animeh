import path from 'path'
import { initTRPC } from '@trpc/server'
import SuperJSON from 'superjson'
import { isValiError } from 'valibot'
import { db } from '~s/db'
import { imagesDirPath } from '~s/utils/path'
import { fetchAndUpdate } from '~s/anime/update'
import { handleReadImageError, readImage, type Image } from '~s/utils/image'
import { imageEmitterMap, pendingImageEmitterMap, type ImageEmitterParam } from '~s/emits/loadImage'
import { getMimeType } from '~s/utils/mime'
import { extension } from '~/shared/utils/file'
import type { ServerWebSocket } from 'bun'
import type { CreateBunContextOptions } from 'trpc-bun-adapter'
import type { anime } from '~s/db/schema'
import type { WebSocketData } from '~s/index'

type ContextOpts = CreateBunContextOptions & { client: ServerWebSocket<WebSocketData> }

const WARM_IMAGE_KEY = '__WARM_IMAGE__'

export const createTRPCContext = (opts: ContextOpts) => {
  if (opts.client.data.id === '') {
    opts.client.close(4000)
  }

  const loadImage = async (value: ImageEmitterParam) => {
    const emitter =
      imageEmitterMap.get(opts.client.data.id) ||
      (await pendingImageEmitterMap.get(opts.client.data.id))

    emitter?.next(value)
  }

  const warmImage = (() => {
    const imagesToWarm: string[] = []

    return (imagePath: string) => {
      // @ts-ignore
      if (ctx[WARM_IMAGE_KEY]) {
        // @ts-ignore
        ctx[WARM_IMAGE_KEY] = () => {
          loadImage(imagesToWarm)

          imagesToWarm.length = 0
        }

        imagesToWarm.push(imagePath)
      } else {
        loadImage([imagePath])
      }
    }
  })()

  const loadedImages = new Set<string>()

  const ctx = {
    db,
    data: opts.client.data,
    loadImage([imagePath, imageExtension]: Image, onError = handleReadImageError) {
      imagePath = imagePath.toString()

      if (loadedImages.has(imagePath)) {
        warmImage(imagePath)

        return
      }

      readImage(imagesDirPath + imagePath + '.' + imageExtension)
        .then(base64 => {
          loadedImages.add(imagePath)

          if (imageExtension === 'webp') {
            loadImage([[imagePath, base64]])
          } else {
            loadImage([[imagePath, base64, getMimeType(imageExtension)]])
          }
        })
        .catch(error => {
          onError(error, [imagePath, imageExtension])
        })
    },
    loadAnimePoster(
      animeData: Parameters<typeof fetchAndUpdate>[0] & Pick<typeof anime.$inferSelect, 'imageUrl'>,
    ) {
      const handleNoImage = async () => {
        const updateData = await fetchAndUpdate(animeData, { updateImage: true })

        this.loadImage([animeData.id, extension(updateData.imageUrl)])
      }

      if (animeData.imageUrl) {
        this.loadImage([animeData.id, extension(animeData.imageUrl)], handleNoImage)
      } else {
        handleNoImage()
      }
    },
  }

  return ctx
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        valiError: isValiError(error.cause) ? error.cause.issues : null,
      },
    }
  },
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const procedure = t.procedure.use(async opts => {
  try {
    // @ts-ignore
    opts.ctx[WARM_IMAGE_KEY] = true

    return await opts.next({ ctx: opts.ctx })
  } finally {
    queueMicrotask(() => {
      // @ts-ignore
      if (typeof opts.ctx[WARM_IMAGE_KEY] === 'function') {
        // @ts-ignore
        opts.ctx[WARM_IMAGE_KEY]()
      }

      // @ts-ignore
      opts.ctx[WARM_IMAGE_KEY] = false
    })
  }
})
