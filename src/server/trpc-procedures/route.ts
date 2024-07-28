import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'
import { procedure, router } from '~s/trpc'

export const RouteRouter = router({
  '/': procedure.query(({ ctx }) => {
    return {
      serverDate: Date.now(),
    }
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
