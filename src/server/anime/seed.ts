import { db } from '~s/db'
import { genres, studios, studioSynonyms } from '~s/db/schema'
import { metadata } from '~s/metadata'
import { isProduction } from '~s/env'
import { prepareStudioData } from '~s/studio/prepare'
import { glob, imagesDirPath } from '~s/utils/path'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { extension } from '~/shared/utils/file'
import { fetchAll, fetchPage } from '~s/external/api/kuramanime/fetch'
import { jikanClient, producerClient, jikanQueue } from '~s/external/api/jikan'
import { insertKuramanimeAnimeListToDb } from '~s/external/api/kuramanime/insert'
import { fetchAndUpdate } from './update'
import { updateEpisode } from './episode/update'
import { updateCharacter } from './character/update'

export const seed = async () => {
  seedGenres()

  if (isProduction()) {
    metadata.get('lastStudioPage').then(fetchStudio)
  }

  const firstAnime = await db.query.anime.findFirst({ columns: { id: true } })

  await (firstAnime ? sync : populate)()

  if (!isProduction()) {
    return
  }

  await updateIncompleteAnimeData()

  await updateIncompleteAnimeEpisodes()

  await updateIncompleteAnimeCharacters()
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

const updateIncompleteAnimeEpisodes = async () => {
  while (true) {
    const animeList = await db.query.anime.findMany({
      where(anime, { and, eq, isNull }) {
        return and(eq(anime.isVisible, true), isNull(anime.episodeUpdatedAt))
      },
      columns: { id: true },
      limit: 10,
    })

    if (animeList.length === 0) {
      break
    }

    for (const animeData of animeList) {
      await updateEpisode(
        {
          id: animeData.id,
          episodeUpdatedAt: null,
        },
        {
          priority: 0,
        },
      )
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
