import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'
import z from 'zod'
import { episodes } from '~s/db/schema'
import { procedure, router } from '~s/trpc'
import { isMoreThanOneDay } from '~/server/utils/time'
import { omit } from '~/shared/utils/object'
import { updateEpisode } from '~s/anime/episode/update'

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

    return animeList.map(animeData => {
      ctx.loadAnimePoster(animeData)

      return omit(animeData, 'malId')
    })
  }),

  '/anime/_$id': procedure.input(z.number()).query(async ({ ctx, input }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      where: (anime, { eq }) => eq(anime.id, input),
      columns: {
        malId: true,
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
      malId: animeData.malId,
      imageExtension: animeData.imageExtension,
    })

    if (isMoreThanOneDay(animeData.episodeUpdatedAt)) {
      updateEpisode(animeData)
    }

    return {
      ...omit(
        animeData,
        'malId',
        'synonyms',
        'animeToGenres',
        'animeToStudios',
        'episodeUpdatedAt',
      ),
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
      columns: { malId: true, episodeUpdatedAt: true },
      where: (anime, { eq }) => eq(anime.id, input),
    })

    if (!animeData) {
      throw new Error('404')
    }

    let episodeList: Omit<typeof episodes.$inferSelect, 'animeId'>[]

    if (isMoreThanOneDay(animeData.episodeUpdatedAt)) {
      episodeList = (await updateEpisode(animeData)).map(episode => omit(episode, 'animeId'))
    } else {
      episodeList = await ctx.db.query.episodes.findMany({
        where: (episodes, { eq }) => eq(episodes.animeId, animeData.malId),
        columns: {
          animeId: false,
        },
      })
    }

    return episodeList
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
