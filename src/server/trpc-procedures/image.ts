import { observable } from '@trpc/server/observable'
import {
  imageEmitterMap,
  pendingImageEmitterMap,
  type ImageEmitterParam,
  type ImageEmitter,
} from '~s/emits/loadImage'
import { procedure } from '~s/trpc'

export const ImageSubscriptionProcedure = procedure.subscription(opts => {
  let activate: (value: ImageEmitter | PromiseLike<ImageEmitter>) => void

  pendingImageEmitterMap.set(
    opts.ctx.data.id,
    new Promise<ImageEmitter>(resolve => {
      activate = resolve
    }),
  )

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
