import { router } from './trpc'
import { LogProcedure } from './trpc-procedures/log'
import { RouteRouter } from './trpc-procedures/route'
import { ProfileRouter } from './trpc-procedures/profile'
import { DownloadRouter } from './trpc-procedures/download'
import { SearchProcedure } from './trpc-procedures/search'
import { ImageSubscriptionProcedure } from './trpc-procedures/image'
import { PosterRouter } from './trpc-procedures/components/poster'

export const TRPCRouter = router({
  log: LogProcedure,
  route: RouteRouter,
  search: SearchProcedure,
  profile: ProfileRouter,
  download: DownloadRouter,
  images: ImageSubscriptionProcedure,
  component: router({
    poster: PosterRouter,
  }),
})
