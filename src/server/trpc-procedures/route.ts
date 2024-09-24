import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { studios, studioSynonyms } from '~s/db/schema'
import { promiseMap } from '~s/map'
import { fetchAndUpdate } from '~s/anime/update'
import { updateEpisode } from '~s/anime/episode/update'
import { dedupeEpisodes } from '~s/anime/episode/dedupe'
import { prepareStudioData } from '~s/studio/prepare'
import { isMoreThanOneDay } from '~s/utils/time'
import { glob, videosDirPath } from '~s/utils/path'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { jikanQueue, producerClient } from '~s/external/api/jikan'
import { omit } from '~/shared/utils/object'
import type { FileRoutesByPath } from '@tanstack/react-router'
import type {
  AnyProcedure,
  AnyRouter,
  CreateRouterOptions,
} from '@trpc/server/unstable-core-do-not-import'

export const RouteRouter = router({
  '/': procedure
    .input(
      v.parser(
        v.object({
          x: v.nullish(v.number()), // x cuma untuk cache busting
          cursor: v.nullish(v.number()),
          downloaded: v.boolean(),
          perPage: v.number(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { cursor, perPage } = input

      const ids = input.downloaded
        ? (await glob(videosDirPath, '*', { onlyFiles: false }))
            .map(dirName => {
              const index = dirName.lastIndexOf('.')
              const id = dirName.slice(index + 1)

              return Number(id)
            })
            .filter(isFinite)
            .sort((a, b) => b - a)
        : null

      const animeList = await ctx.db.query.anime.findMany({
        limit: perPage,
        orderBy: (anime, { desc }) => [desc(anime.id)],
        where: ids
          ? (anime, { inArray }) => {
              const cursorIndex = (ids as (typeof cursor)[]).indexOf(cursor) + 1

              return inArray(anime.id, ids.slice(cursorIndex))
            }
          : cursor
            ? (anime, { lt }) => lt(anime.id, cursor)
            : undefined,
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

  '/anime/_$id': procedure
    .input(v.parser(v.object({ id: v.number(), ref: v.optional(v.number()) })))
    .query(async ({ ctx, input }) => {
      const mapKey = (ref: number) => `/anime/_$id:${ref}`

      if (input.ref) {
        const key = mapKey(input.ref)
        const refPromise = promiseMap.get(key)

        if (refPromise) {
          promiseMap.delete(key)

          await refPromise
        }
      }

      const animeData = await ctx.db.query.anime.findFirst({
        where: (anime, { eq }) => eq(anime.id, input.id),
        columns: {
          title: true,
          japaneseTitle: true,
          englishTitle: true,
          synopsis: true,
          totalEpisodes: true,
          airedFrom: true,
          airedTo: true,
          score: true,
          scoredBy: true,
          rating: true,
          duration: true,
          rank: true,
          popularity: true,
          members: true,
          type: true,
          imageExtension: true,
          updatedAt: true,
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
              studioId: true,
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

      if (!input.ref) {
        ctx.loadAnimePoster({
          id: input.id,
          imageExtension: animeData.imageExtension,
        })

        updateEpisode({ id: input.id, episodeUpdatedAt: animeData.episodeUpdatedAt })
      }

      const ref = input.id + Math.random()
      const storeRefPromise = (promise: Promise<unknown>) => {
        const key = mapKey(ref)

        promiseMap.set(key, promise)

        setTimeout(() => {
          promiseMap.delete(key)
        }, 30_000)
      }

      let shouldFetchData = animeData.synopsis === null
      if (shouldFetchData) {
        storeRefPromise(fetchAndUpdate(input))
      }

      const result = {
        ...omit(
          animeData,
          'synonyms',
          'animeToGenres',
          'animeToStudios',
          'updatedAt',
          'episodeUpdatedAt',
        ),
        id: input.id,
        synonyms: animeData.synonyms.map(({ synonym }) => synonym),
        genres: animeData.animeToGenres.map(({ genre }) => genre.name),
        studios: animeData.animeToStudios.map(({ studio, type, studioId }) => {
          let name: string | null
          if (studio) {
            name = studio.name
          } else {
            name = null

            if (!shouldFetchData) {
              shouldFetchData = true

              storeRefPromise(
                (async () => {
                  const producerResponse = await jikanQueue.add(
                    () => producerClient.getProducerById(studioId),
                    { priority: 2, throwOnTimeout: true },
                  )

                  const [studio, synonymList] = prepareStudioData(producerResponse.data)

                  if (synonymList.length) {
                    ctx.db
                      .insert(studioSynonyms)
                      .values(synonymList)
                      .onConflictDoNothing()
                      .execute()
                  }

                  await ctx.db
                    .insert(studios)
                    .values(studio)
                    .onConflictDoUpdate({
                      target: studios.id,
                      set: buildConflictUpdateColumns(studios, [
                        'name',
                        'imageUrl',
                        'establishedAt',
                        'about',
                      ]),
                    })
                })(),
              )
            }
          }

          return { name, type }
        }),
        ref: shouldFetchData ? ref : null,
      }

      if (!input.ref && !result.ref && isMoreThanOneDay(animeData.updatedAt)) {
        result.ref = ref

        storeRefPromise(fetchAndUpdate(input))
      }

      return result
    }),

  '/anime/_$id/$id/_episode': procedure
    .input(v.parser(v.number()))
    .query(async ({ ctx, input }) => {
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
