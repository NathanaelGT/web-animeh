import { observable } from '@trpc/server/observable'
import {
  imageEmitterMap,
  pendingImageEmitterMap,
  type ImageEmitterParam,
  type ImageEmitter,
} from '~s/emits/loadImage'
import { procedure } from '~s/trpc'

export const ImageSubscriptionProcedure = procedure.subscription(opts => {
  const { promise, resolve: activate } = Promise.withResolvers<ImageEmitter>()

  pendingImageEmitterMap.set(opts.ctx.data.id, promise)

  return observable<ImageEmitterParam>(emit => {
    imageEmitterMap.set(opts.ctx.data.id, emit)

    activate(emit)

    setTimeout(() => {
      pendingImageEmitterMap.delete(opts.ctx.data.id)
    })

    return () => {
      imageEmitterMap.delete(opts.ctx.data.id)
    }
  })
})
