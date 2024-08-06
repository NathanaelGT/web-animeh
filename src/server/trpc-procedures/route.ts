import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'
import z from 'zod'
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

  '/anime/$id': procedure.input(z.number()).query(async ({ ctx, input }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      where: (anime, { eq }) => eq(anime.id, input),
      columns: {
        title: true,
        japaneseTitle: true,
        englishTitle: true,
        synopsis: true,
        totalEpisodes: true,
        airedFrom: true,
        airedTo: true,
        score: true,
        rating: true,
        duration: true,
        type: true,
        imageExtension: true,
      },
      with: {
        synonyms: {
          columns: {
            synonym: true,
          },
        },
        animeToGenres: {
          columns: {},
          with: {
            genre: {
              columns: {
                name: true,
              },
            },
          },
        },
        animeToStudios: {
          columns: {
            type: true,
          },
          with: {
            studio: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!animeData) {
      return animeData
    }

    ctx.loadImage(input + '.' + animeData.imageExtension)

    return {
      ...omit(animeData, 'synonyms', 'animeToGenres', 'animeToStudios'),
      synonyms: animeData.synonyms.map(({ synonym }) => synonym),
      genres: animeData.animeToGenres.map(({ genre }) => genre.name),
      studios: animeData.animeToStudios.map(({ studio, type }) => ({
        name: studio?.name || null,
        type,
      })),
    }
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
