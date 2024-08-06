import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'
import { procedure, router } from '~s/trpc'
import { jikanClient } from '~s/external/api/jikan'
import { omit } from '~/shared/utils/object'
import { update } from '~s/anime/update'

export const RouteRouter = router({
  '/': procedure.query(async ({ ctx }) => {
    const animeList = await ctx.db.query.anime.findMany({
      limit: 48,
      orderBy: (anime, { desc }) => [desc(anime.airedFrom), desc(anime.airedTo)],
      columns: {
        id: true,
        malId: true,
        title: true,
        type: true,
        rating: true,
        duration: true,
        totalEpisodes: true,
        imageExtension: true,
      },
    })

    type Anime = (typeof animeList)[number]

    const posterMap = new Map<string, Anime>()
    const animeListResponse: Omit<Anime, 'malId'>[] = []

    const handleNoImage = async (animeData: Anime) => {
      const { malId } = animeData
      if (malId === null) {
        return
      }

      const { data } = await jikanClient.anime.getAnimeFullById(malId)

      const updateData = await update(data, animeData, { updateImage: true })

      ctx.loadImage(animeData.id + '.' + updateData.imageExtension)
    }

    for (const animeData of animeList) {
      if (animeData.imageExtension) {
        posterMap.set(animeData.id + '.' + animeData.imageExtension, animeData)
      } else {
        handleNoImage(animeData)
      }

      animeListResponse.push(omit(animeData, 'malId'))
    }

    ctx.loadImage(posterMap.keys(), (_, path) => {
      handleNoImage(posterMap.get(path)!)
    })

    return animeListResponse
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
