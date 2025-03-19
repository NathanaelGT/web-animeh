import { isNull, inArray, sql, type SQL } from 'drizzle-orm'
import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { anime, studios, studioSynonyms } from '~s/db/schema'
import * as episodeRepository from '~s/db/repository/episode'
import { promiseMap } from '~s/map'
import { fetchAndUpdate } from '~s/anime/update'
import { updateEpisode } from '~s/anime/episode/update'
import { updateCharacter } from '~s/anime/character/update'
import { prepareStudioData } from '~s/studio/prepare'
import { isMoreThanOneDay } from '~s/utils/time'
import { glob, videosDirPath } from '~s/utils/path'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { jikanQueue, producerClient } from '~s/external/api/jikan'
import { downloadProgressSnapshot } from '~s/external/download/progress'
import { omit } from '~/shared/utils/object'
import { RouteNotFoundError } from '~/shared/error'
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
          cursor: v.nullish(v.number()),
          perPage: v.number(),
          filter: v.string(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { cursor, perPage } = input
      const inputFilter = input.filter as 'ongoing' | 'downloaded' | (string & {})

      let filter: SQL<unknown> | undefined
      switch (inputFilter) {
        case '':
          break

        case 'ongoing':
          filter = isNull(anime.airedTo)

          break

        case 'downloaded': {
          const ids = (await glob(videosDirPath, '*', { onlyFiles: false }))
            .map(dirName => {
              const index = dirName.lastIndexOf('.')
              const id = dirName.slice(index + 1)

              return Number(id)
            })
            .filter(isFinite)
            .sort((a, b) => b - a)

          filter = inArray(anime.id, ids.slice((ids as (typeof cursor)[]).indexOf(cursor) + 1))

          break
        }

        default:
          throw new RouteNotFoundError(`Unknown filter: ${inputFilter}`)
      }

      const animeList = await ctx.db.query.anime.findMany({
        limit: perPage,
        orderBy: (anime, { desc }) => [desc(anime.airedFrom), desc(anime.id)],
        where(_, { and, eq, lt }) {
          return and(
            eq(anime.isVisible, true),
            filter,
            inputFilter !== 'downloaded' && cursor
              ? lt(
                  sql.raw(`(${anime.airedFrom.name}, ${anime.id.name})`),
                  ctx.db
                    .select({
                      [anime.airedFrom.name]: anime.airedFrom,
                      [anime.id.name]: anime.id,
                    })
                    .from(anime)
                    .where(eq(anime.id, cursor)),
                )
              : undefined,
          )
        },
        columns: {
          id: true,
          title: true,
          type: true,
          rating: true,
          duration: true,
          totalEpisodes: true,
          imageUrl: true,
        },
      })

      for (const animeData of animeList) {
        ctx.loadAnimePoster(animeData)
      }

      return animeList.map(anime => omit(anime, 'imageUrl'))
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
          id: true,
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
          imageUrl: true,
          isVisible: true,
          updatedAt: true,
          episodeUpdatedAt: true,
          characterUpdatedAt: true,
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
        ctx.loadAnimePoster(animeData)

        void updateEpisode(animeData)
        void updateCharacter(animeData)
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
          'imageUrl',
          'updatedAt',
          'episodeUpdatedAt',
          'characterUpdatedAt',
        ),
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
    .query(async ({ ctx, input: animeId }) => {
      const animeData = await ctx.db.query.anime.findFirst({
        columns: { id: true, title: true, episodeUpdatedAt: true },
        where: (anime, { eq }) => eq(anime.id, animeId),
      })

      if (!animeData) {
        throw new Error('404')
      }

      void updateEpisode(animeData)

      return episodeRepository.findByAnime(animeData)
    }),

  '/pengaturan/unduhan': procedure.query(() => {
    const snapshot: Record<string, episodeRepository.DownloadProgressDataWithoutDone> = {}

    downloadProgressSnapshot.forEach((data, name) => {
      if (!data.done) {
        snapshot[name] = omit(data, 'done') as episodeRepository.DownloadProgressDataWithoutDone
      }
    })

    return snapshot
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
