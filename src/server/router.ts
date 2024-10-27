import { router } from './trpc'
import { LogProcedure } from './trpc-procedures/log'
import { AnimeRouter } from './trpc-procedures/anime'
import { RouteRouter } from './trpc-procedures/route'
import { ProfileRouter } from './trpc-procedures/profile'
import { DownloadRouter } from './trpc-procedures/download'
import { SearchProcedure } from './trpc-procedures/search'
import { ImageSubscriptionProcedure } from './trpc-procedures/image'
import { PosterRouter } from './trpc-procedures/components/poster'
import { AnimeTitleRouter } from './trpc-procedures/components/anime-title'

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
