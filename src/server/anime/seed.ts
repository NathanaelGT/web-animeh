import * as v from 'valibot'
import { db } from '~s/db'
import { genres, ongoingAnimeUpdates, studios, studioSynonyms } from '~s/db/schema'
import { metadata } from '~s/metadata'
import * as kyInstances from '~s/ky'
import { prepareStudioData } from '~s/studio/prepare'
import { glob, imagesDirPath } from '~s/utils/path'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { parseMalId } from '~s/utils/mal'
import { extension } from '~/shared/utils/file'
import { daysPassedSince, getPastDate } from '~/shared/utils/date'
import { fetchAll, fetchPage } from '~s/external/api/kuramanime/fetch'
import { limitRequest } from '~s/external/limit'
import { jikanClient, producerClient, jikanQueue } from '~s/external/api/jikan'
import { insertKuramanimeAnimeListToDb } from '~s/external/api/kuramanime/insert'
import { fetchAndUpdate } from './update'
import { updateEpisode } from './episode/update'
import { updateCharacter } from './character/update'

export const seed = async () => {
  seedGenres()

  if (Bun.env.PROD) {
    metadata.get('lastStudioPage').then(fetchStudio)
  }

  const firstAnime = await db.query.anime.findFirst({ columns: { id: true } })
  if (firstAnime) {
    await sync()
  } else {
    await populate()
  }

  updateOngoingProviderData()

  if (!Bun.env.PROD) {
    return
  }

  await updateIncompleteAnimeData()

  await updateOngoingJikanData()

  await updateIncompleteAnimeEpisodes()

  await updateIncompleteAnimeCharacters()

  setInterval(updateOngoingJikanData, 24 * 60 * 60 * 1000)
}

const seedGenres = async () => {
  await jikanQueue.add(async () => {
    const malGenreList = await jikanClient.genres.getAnimeGenres()

    const genreList: (typeof genres.$inferInsert)[] = malGenreList.data.map(genre => ({
      id: genre.mal_id,
      name: genre.name,
    }))

    await db
      .insert(genres)
      .values(genreList)
      .onConflictDoUpdate({
        target: genres.id,
        set: buildConflictUpdateColumns(genres, ['name']),
      })
  })
}

async function fetchStudio(startPage: number) {
  const producers = await jikanQueue.add(
    () => {
      return producerClient.getProducers({
        page: startPage,
      })
    },
    { priority: 1, throwOnTimeout: true },
  )

  const start = performance.now()

  const promises: Promise<unknown>[] = []

  const studioList: (typeof studios.$inferInsert)[] = []
  const synonymList: (typeof studioSynonyms.$inferInsert)[] = []
  for (const producer of producers.data) {
    const [studio, synonyms] = prepareStudioData(producer)

    studioList.push(studio)
    synonymList.push(...synonyms)
  }

  if (studioList.length) {
    promises.push(
      db
        .insert(studios)
        .values(studioList)
        .onConflictDoUpdate({
          target: studios.id,
          set: buildConflictUpdateColumns(studios, ['name', 'imageUrl', 'establishedAt', 'about']),
        })
        .execute(),
    )
  }

  if (synonymList.length) {
    promises.push(db.insert(studioSynonyms).values(synonymList).onConflictDoNothing().execute())
  }

  await Promise.all(promises)

  await metadata.set('lastStudioPage', startPage)

  if (producers.pagination.has_next_page) {
    const end = performance.now()

    // https://jikan.docs.apiary.io/#introduction/information/rate-limiting
    setTimeout(
      () => {
        fetchStudio(startPage + 1)
      },
      4000 - (end - start),
    )
  }
}

const populate = async () => {
  const imageList = new Set(await glob(imagesDirPath, '*'))

  await fetchAll(animeList => {
    return insertKuramanimeAnimeListToDb(animeList, imageList, { withCreatedAt: false })
  })
}

const sync = async () => {
  const imageListPromise = glob(imagesDirPath, '*')
  const { perPage, lastPage } = await metadata.get('kuramanimeCrawl')

  let [parsedData, imageListArr] = await Promise.all([fetchPage(lastPage), imageListPromise])
  const newPerPage = parsedData.animes.per_page
  const imageList = new Set(imageListArr)

  const insertParsedDataToDb = async () => {
    await Promise.all([
      insertKuramanimeAnimeListToDb(parsedData.animes.data, imageList, { withCreatedAt: true }),

      metadata.set('kuramanimeCrawl', {
        perPage: newPerPage,
        lastPage: parsedData.animes.last_page,
      }),
    ])
  }

  let page: number
  if (newPerPage !== perPage) {
    page = Math.floor(((lastPage - 1) * perPage) / newPerPage)
  } else {
    page = lastPage + 1
    await insertParsedDataToDb()
  }

  while (page <= parsedData.animes.last_page) {
    parsedData = await fetchPage(page++)

    await insertParsedDataToDb()
  }
}

let updateOngoingProviderDataTimer: Timer | null = null
export const updateOngoingProviderData = async () => {
  const postSchema = v.object({
    type: v.string(),
    episode: v.number(),
    created_at: v.string(),
  })

  const animeSchema = v.object({
    id: v.number(),
    mal_url: v.nullable(v.pipe(v.string(), v.url())),
    latest_post_at: v.nullable(v.string()),
    country_code: v.nullable(v.string()),
    posts: v.array(postSchema),
  })

  const listResultSchema = v.object({
    animes: v.object({
      data: v.array(animeSchema),
      last_page: v.number(),
    }),
  })

  const fetchAnimeList = async (page: number) => {
    const response = await limitRequest(() => {
      return kyInstances.kuramanime.get(
        `quick/ongoing?order_by=updated&page=${page}&need_json=true`,
      )
    })

    return v.parse(listResultSchema, await response.json())
  }

  const firstAnimePagePromise = fetchAnimeList(1)
  const animePagePromises = [firstAnimePagePromise]

  const [firstAnimePage, kuramanimeOngoingLastFetchAt, kuramanimeOngoingLastResetAt] =
    await Promise.all([
      firstAnimePagePromise,
      metadata.get('kuramanimeOngoingLastFetchAt'),
      metadata.get('kuramanimeOngoingLastResetAt'),
    ])

  const shouldReset =
    kuramanimeOngoingLastResetAt && daysPassedSince(kuramanimeOngoingLastResetAt) > 30

  const newKuramanimeOngoingLastFetchAt = new Date()

  let page = 2
  const lastPage = firstAnimePage.animes.last_page
  const maxPage = shouldReset
    ? lastPage
    : Math.min(
        kuramanimeOngoingLastFetchAt
          ? Math.ceil(daysPassedSince(kuramanimeOngoingLastFetchAt))
          : Infinity,
        lastPage,
      )
  for (; page <= maxPage; page++) {
    animePagePromises[page - 1] = fetchAnimeList(page)
  }

  const ongoingAnimeUpdateList: (typeof ongoingAnimeUpdates.$inferInsert)[] = []
  const processAnimeData = (animePage: v.InferOutput<typeof listResultSchema>) => {
    for (const animeData of animePage.animes.data) {
      if (animeData.mal_url && animeData.posts.length && animeData.country_code === 'JP') {
        const id = parseMalId(animeData.mal_url)

        if (!isNaN(id)) {
          let latestEpisode: v.InferOutput<typeof postSchema> | undefined
          for (const post of animeData.posts) {
            if (
              post.type === 'Episode' &&
              (!latestEpisode || post.episode > latestEpisode.episode)
            ) {
              latestEpisode = post
            }
          }

          if (latestEpisode) {
            ongoingAnimeUpdateList.push({
              animeId: id,
              provider: 'kuramanime',
              lastEpisodeAiredAt: new Date(latestEpisode.created_at),
            })
          }
        }
      }
    }
  }

  for await (const animePage of animePagePromises) {
    processAnimeData(animePage)
  }

  if (kuramanimeOngoingLastFetchAt) {
    while (
      ongoingAnimeUpdateList.at(-1)!.lastEpisodeAiredAt!.getTime() >
        kuramanimeOngoingLastFetchAt.getTime() &&
      page <= lastPage
    ) {
      const animePage = await fetchAnimeList(page++)

      processAnimeData(animePage)
    }
  }

  await db.transaction(async tx => {
    if (shouldReset) {
      await tx.delete(ongoingAnimeUpdates)
    }

    await tx
      .insert(ongoingAnimeUpdates)
      .values(ongoingAnimeUpdateList)
      .onConflictDoUpdate({
        target: [ongoingAnimeUpdates.animeId, ongoingAnimeUpdates.provider],
        set: buildConflictUpdateColumns(ongoingAnimeUpdates, ['lastEpisodeAiredAt']),
      })

    await Promise.all([
      metadata.set('kuramanimeOngoingLastFetchAt', newKuramanimeOngoingLastFetchAt, tx),
      shouldReset !== false
        ? metadata.set('kuramanimeOngoingLastResetAt', newKuramanimeOngoingLastFetchAt, tx)
        : null,
    ])
  })

  if (updateOngoingProviderDataTimer) {
    clearTimeout(updateOngoingProviderDataTimer)
  }
  updateOngoingProviderDataTimer = setTimeout(updateOngoingProviderData, 15 * 60 * 1000)
}

const updateIncompleteAnimeData = async () => {
  while (true) {
    const animeList = await db.query.anime.findMany({
      where(anime, { and, eq, isNull }) {
        return and(eq(anime.isVisible, true), isNull(anime.synopsis))
      },
      columns: { id: true, imageUrl: true },
      limit: 10,
    })

    if (animeList.length === 0) {
      break
    }

    for (const animeData of animeList) {
      const ext = animeData.imageUrl ? extension(animeData.imageUrl) : null

      await fetchAndUpdate(animeData, {
        updateImage:
          ext !== 'webp' || (await Bun.file(imagesDirPath + animeData.id + '.' + ext).exists()),
        priority: 0,
      })
    }
  }
}

const updateOngoingJikanData = async () => {
  while (true) {
    const animeList = await db.query.anime.findMany({
      where(anime, { and, eq, isNull, lt }) {
        return and(
          eq(anime.isVisible, true),
          isNull(anime.airedTo),
          lt(anime.fetchedAt, getPastDate(1)),
        )
      },
      orderBy: (anime, { desc }) => [desc(anime.airedFrom), desc(anime.id)],
      columns: { id: true },
      limit: 10,
    })

    if (animeList.length === 0) {
      break
    }

    for (const animeData of animeList) {
      await fetchAndUpdate(animeData, {
        priority: 0,
      })
    }
  }
}

const updateIncompleteAnimeEpisodes = async () => {
  while (true) {
    const animeList = await db.query.anime.findMany({
      where(anime, { and, eq, isNull }) {
        return and(eq(anime.isVisible, true), isNull(anime.episodeUpdatedAt))
      },
      columns: { id: true, title: true },
      limit: 10,
    })

    if (animeList.length === 0) {
      break
    }

    for (const animeData of animeList) {
      await updateEpisode(animeData, {
        priority: 0,
      })
    }
  }
}

const updateIncompleteAnimeCharacters = async () => {
  while (true) {
    const animeList = await db.query.anime.findMany({
      where(anime, { and, eq, isNull }) {
        return and(eq(anime.isVisible, true), isNull(anime.characterUpdatedAt))
      },
      columns: { id: true },
      limit: 10,
    })

    if (animeList.length === 0) {
      break
    }

    for (const animeData of animeList) {
      await updateCharacter(
        {
          id: animeData.id,
          characterUpdatedAt: null,
        },
        {
          priority: 0,
        },
      )
    }
  }
}
