import { router } from './trpc'
import { LogProcedure } from './trpc-procedures/log'
import { RouteRouter } from './trpc-procedures/route'
import { ImageSubscriptionProcedure } from './trpc-procedures/image'

export const TRPCRouter = router({
  log: LogProcedure,
  route: RouteRouter,
  images: ImageSubscriptionProcedure,
})
