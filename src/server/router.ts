import { router } from './trpc'
import { AnimeRouter } from './trpc-procedures/anime'
import { AnimeTitleRouter } from './trpc-procedures/components/anime-title'
import { PosterRouter } from './trpc-procedures/components/poster'
import { DownloadRouter } from './trpc-procedures/download'
import { ImageSubscriptionProcedure } from './trpc-procedures/image'
import { LogProcedure } from './trpc-procedures/log'
import { ProfileRouter } from './trpc-procedures/profile'
import { RouteRouter } from './trpc-procedures/route'
import { SearchProcedure } from './trpc-procedures/search'

export const TRPCRouter = router({
  log: LogProcedure,
  anime: AnimeRouter,
  route: RouteRouter,
  search: SearchProcedure,
  profile: ProfileRouter,
  download: DownloadRouter,
  images: ImageSubscriptionProcedure,
  component: router({
    poster: PosterRouter,
    animeTitle: AnimeTitleRouter,
  }),
})
