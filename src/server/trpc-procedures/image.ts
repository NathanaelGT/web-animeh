import { observable } from '@trpc/server/observable'
import { procedure } from '~s/trpc'
import {
  imageEmitterMap,
  pendingImageEmitterMap,
  type ImageType,
  type ImageEmitter,
} from '~/server/emits/loadImage'

export const ImageSubscriptionProcedure = procedure.subscription(opts => {
  let activate: (value: ImageEmitter | PromiseLike<ImageEmitter>) => void

  pendingImageEmitterMap.set(
    opts.ctx.data.id,
    new Promise<ImageEmitter>(resolve => {
      activate = resolve
    }),
  )

  return observable<ImageType>(emit => {
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
