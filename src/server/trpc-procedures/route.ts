import {
  isNull,
  inArray,
  or,
  gt,
  sql,
  eq,
  and,
  lt,
  asc,
  desc,
  notInArray,
  type SQL,
} from 'drizzle-orm'
import * as v from 'valibot'
import { updateCharacter } from '~s/anime/character/update'
import { getStoredAnimeIds } from '~s/anime/episode/stored'
import { updateEpisode } from '~s/anime/episode/update'
import { updateOngoingProviderData } from '~s/anime/seed'
import { fetchAndUpdate } from '~s/anime/update'
import * as episodeRepository from '~s/db/repository/episode'
import { anime, animeToGenres, ongoingAnimeUpdates, studios, studioSynonyms } from '~s/db/schema'
import { jikanQueue, producerClient } from '~s/external/api/jikan'
import { downloadProgressSnapshot } from '~s/external/download/progress'
import { promiseMap } from '~s/map'
import { prepareStudioData } from '~s/studio/prepare'
import { procedure, router } from '~s/trpc'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { isMoreThanOneDay } from '~s/utils/time'
import { RouteNotFoundError } from '~/shared/error'
import { getPastDate } from '~/shared/utils/date'
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
          // cari cara ngebuat client revalidate
          updateOngoingProviderData()

          filter = or(isNull(anime.airedTo), gt(anime.airedTo, getPastDate(7)))

          break

        case 'downloaded': {
          filter = inArray(anime.id, await getStoredAnimeIds())

          break
        }

        default:
          throw new RouteNotFoundError(`Unknown filter: ${inputFilter}`)
      }

      let animeListQuery = ctx.db
        .select({
          id: anime.id,
          title: anime.title,
          type: anime.type,
          rating: anime.rating,
          duration: anime.duration,
          totalEpisodes: anime.totalEpisodes,
          imageUrl: anime.imageUrl,
        })
        .from(anime)
        .$dynamic()

      const createWhereCondition = (...extraConditions: (SQL | undefined)[]) => {
        const userFilterPreferences = ctx.data.profile.settings.animeFilter

        return and(
          eq(anime.isVisible, true),

          userFilterPreferences.hideRating.length
            ? notInArray(anime.rating, userFilterPreferences.hideRating)
            : undefined,

          userFilterPreferences.hideGenre.length
            ? notInArray(
                anime.id,
                ctx.db
                  .select({ animeId: animeToGenres.animeId })
                  .from(animeToGenres)
                  .where(inArray(animeToGenres.genreId, userFilterPreferences.hideGenre)),
              )
            : undefined,

          filter,

          ...extraConditions,
        )
      }

      if (inputFilter === 'ongoing') {
        const oau = ctx.db
          .select({
            animeId: ongoingAnimeUpdates.animeId,
            lastEpisodeAiredAt: ongoingAnimeUpdates.lastEpisodeAiredAt,
            rn: sql
              .raw(
                `row_number() over (partition by "${ongoingAnimeUpdates.animeId.name}" order by "${ongoingAnimeUpdates.lastEpisodeAiredAt.name}" asc)`,
              )
              .as('rn'),
          })
          .from(ongoingAnimeUpdates)
          .as('oau')

        animeListQuery = animeListQuery
          .leftJoin(oau, and(eq(anime.id, oau.animeId), eq(oau.rn, 1)))
          .where(createWhereCondition())
          .orderBy(
            asc(sql.raw(`${oau.lastEpisodeAiredAt.name} is null`)),
            desc(oau.lastEpisodeAiredAt),

            asc(sql.raw(`${anime.episodeUpdatedAt.name} is null`)),
            desc(anime.episodeUpdatedAt),

            asc(sql.raw(`${anime.airedFrom.name} is null`)),
            desc(anime.airedFrom),

            desc(anime.id),
          )
      } else {
        animeListQuery = animeListQuery
          .where(
            createWhereCondition(
              cursor
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
            ),
          )
          .orderBy(
            desc(
              sql.raw(
                // dibagi 100k karena kolomnya dateDiv100
                `(${anime.airedTo.name} is null or ${anime.airedTo.name} > ${new Date().getTime() / 100_000})`,
              ),
            ),
            desc(anime.airedFrom),
            desc(anime.id),
          )
          .limit(perPage)
      }

      const animeList = await animeListQuery

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

  '/pengaturan/filter': procedure.query(async ({ ctx }) => {
    return {
      genres: await ctx.db.query.genres.findMany(),
    }
  }),
} satisfies Record<
  keyof FileRoutesByPath, // FIXME keyof FileRoutesByPath selalu never
  AnyProcedure | CreateRouterOptions | AnyRouter
>)
