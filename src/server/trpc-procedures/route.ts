import z from 'zod'
import { procedure, router } from '~s/trpc'
import { updateEpisode } from '~s/anime/episode/update'
import { dedupeEpisodes } from '~s/anime/episode/dedupe'
import { omit } from '~/shared/utils/object'
import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'

export const RouteRouter = router({
  '/': procedure.input(z.object({ cursor: z.number().nullish() })).query(async ({ ctx, input }) => {
    const perPage = 48

    const animeList = await ctx.db.query.anime.findMany({
      limit: perPage,
      orderBy: (anime, { desc }) => [desc(anime.id)],
      where: input.cursor ? (anime, { lt }) => lt(anime.id, input.cursor!) : undefined,
      columns: {
        id: true,
        title: true,
        type: true,
        rating: true,
        duration: true,
        totalEpisodes: true,
        imageExtension: true,
      },
    })

    for (const animeData of animeList) {
      ctx.loadAnimePoster(animeData)
    }

    return animeList
  }),

  '/anime/_$id': procedure.input(z.number()).query(async ({ ctx, input }) => {
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
        episodeUpdatedAt: true,
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
      throw new Error('404')
    }

    ctx.loadAnimePoster({
      id: input,
      imageExtension: animeData.imageExtension,
    })

    updateEpisode({ id: input, episodeUpdatedAt: animeData.episodeUpdatedAt })

    return {
      ...omit(animeData, 'synonyms', 'animeToGenres', 'animeToStudios', 'episodeUpdatedAt'),
      synonyms: animeData.synonyms.map(({ synonym }) => synonym),
      genres: animeData.animeToGenres.map(({ genre }) => genre.name),
      studios: animeData.animeToStudios.map(({ studio, type }) => ({
        name: studio?.name || null,
        type,
      })),
    }
  }),

  '/anime/_$id/$id/_episode': procedure.input(z.number()).query(async ({ ctx, input }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      columns: { episodeUpdatedAt: true },
      where: (anime, { eq }) => eq(anime.id, input),
    })

    if (!animeData) {
      throw new Error('404')
    }

    const [freshEpisodeList, dbEpisodeList] = await Promise.all([
      updateEpisode({ id: input, episodeUpdatedAt: animeData.episodeUpdatedAt }),

      ctx.db.query.episodes.findMany({
        where: (episodes, { eq }) => eq(episodes.animeId, input),
        columns: {
          animeId: false,
        },
      }),
    ])

    return dedupeEpisodes(dbEpisodeList, freshEpisodeList, episode => omit(episode, 'animeId'))
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
