import path from 'path'
import { initTRPC } from '@trpc/server'
import SuperJSON from 'superjson'
import { ZodError } from 'zod'
import { db } from '~s/db'
import { basePath } from '~s/utils/path'
import { handleReadImageError, readImage } from '~s/utils/image'
import { imageEmitterMap, pendingImageEmitterMap } from '~s/emits/loadImage'
import type { ServerWebSocket } from 'bun'
import type { CreateBunContextOptions } from 'trpc-bun-adapter'
import type { WebSocketData } from '~s/index'

type ContextOpts = CreateBunContextOptions & { client: ServerWebSocket<WebSocketData> }

export const createTRPCContext = (opts: ContextOpts) => {
  const loadedImages = new Set<string>()

  return {
    db,
    data: opts.client.data,
    loadImage(imagePath: string) {
      void (async () => {
        let emit = imageEmitterMap.get(opts.client.data.id)
        if (emit === undefined) {
          const pending = pendingImageEmitterMap.get(opts.client.data.id)
          if (pending === undefined) {
            return
          }

          emit = await pending
        }

        if (loadedImages.has(imagePath)) {
          emit.next([imagePath])

          return
        }

        loadedImages.add(imagePath)

        const imgPath = path.join(basePath, 'images', imagePath)

        try {
          emit.next([imagePath, await readImage(imgPath)])
        } catch (error) {
          handleReadImageError(imagePath, error)
        }
      })()

      return imagePath
    },
  }
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
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const procedure = t.procedure
