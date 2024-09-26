import path from 'path'
import ky, { type KyResponse } from 'ky'
import { db } from '~s/db'
import { anime, animeMetadata, episodes, genres, studios, studioSynonyms } from '~s/db/schema'
import { metadata } from '~s/metadata'
import { prepareStudioData } from '~s/studio/prepare'
import { basePath, glob } from '~s/utils/path'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { parseNumber } from '~/shared/utils/number'
import { fetchAll } from '~s/external/api/kuramanime'
import { limitRequest } from '~s/external/limit'
import { jikanClient, producerClient, jikanQueue } from '~s/external/api/jikan'
import { extension } from '~/shared/utils/file'
import { fetchAndUpdate } from './update'
import { updateEpisode } from './episode/update'
import { updateCharacter } from './character/update'

export const seed = () => {
  db.query.anime.findFirst({ columns: { id: true } }).then(async firstAnime => {
    const imageDirPath = path.join(basePath, 'images/')

    if (firstAnime) {
      await updateIncompleteAnimeData(imageDirPath)

      await updateIncompleteAnimeEpisodes()

      await updateIncompleteAnimeCharacters()
    } else {
      populate(imageDirPath)
    }
  })

  metadata.get('lastStudioPage').then(fetchStudio)
}

const populate = async (imageDirPath: string) => {
  const imageListPromise = glob(imageDirPath, '*')

  let populateGenrePromise: Promise<void> | null = jikanQueue.add(async () => {
    const malGenreList = await jikanClient.genres.getAnimeGenres()

    const genreList: (typeof genres.$inferInsert)[] = malGenreList.data.map(genre => ({
      id: genre.mal_id,
      name: genre.name,
    }))

    await db.insert(genres).values(genreList)
  })

  const parseKuramanimeDate = (date: string) => {
    let [day, month, year] = date.split(' ') as [string, string, string]

    month =
      {
        Mei: 'May',
        Agt: 'Aug',
        Okt: 'Oct',
        Des: 'Dec',
      }[month] || month

    return new Date(`${year} ${month} ${day}`)
  }

  const parseKuramanimeDurationRegex = new RegExp(
    '[^0-9]*(?:([0-9]+)jam)?(?:([0-9]+)(?:menit|mnt))?(?:([0-9]+)detik|dtk)?.*',
  )
  const parseKuramanimeDuration = (duration: string | null | undefined) => {
    duration = duration?.replaceAll(' ', '')
    if (!duration) {
      return null
    }

    const [, hours, minutes, seconds] = duration.toLowerCase().match(parseKuramanimeDurationRegex)!

    return Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)
  }

  const imageResponsePromiseMap = new Map<string, Promise<[string, KyResponse]>>()

  const now = new Date()

  const imageList = new Set(await imageListPromise)
  const storedAnimeList = new Map<number, string>()

  fetchAll(async animeList => {
    const animeDataList: (typeof anime.$inferInsert)[] = []
    const animeMetadataList: (typeof animeMetadata.$inferInsert)[] = []
    const episodeList: (typeof episodes.$inferInsert)[] = []

    for (const animeData of animeList) {
      if (
        animeData.mal_url === null ||
        ['Music', 'CM', 'PV'].includes(animeData.type) ||
        animeData.title.endsWith('(Dub ID)') ||
        animeData.title.endsWith('(Dub JP)')
      ) {
        continue
      }

      const duration = parseKuramanimeDuration(animeData.duration)
      if (typeof duration === 'number' && duration < 301) {
        continue
      }

      const slicedMalUrl = animeData.mal_url.slice('https://myanimelist.net/anime/'.length)
      const id = Number(slicedMalUrl?.slice(0, slicedMalUrl.indexOf('/')))
      if (isNaN(id)) {
        continue
      }

      const storedTitle = storedAnimeList.get(id)
      const createProviderData = () => {
        if (!storedTitle) {
          return null
        }

        const extra = animeData.title.slice(storedTitle.length).trim()

        if (extra.startsWith('(') && extra.endsWith(')')) {
          return extra.slice(1, -1)
        }
        return extra
      }

      animeMetadataList.push({
        animeId: id,
        provider: 'kuramanime',
        providerId: animeData.id,
        providerSlug: animeData.slug,
        providerData: createProviderData(),
      })

      // kadang ada yang duplikat, misalnya untuk versi uncensored
      if (storedTitle) {
        continue
      }
      storedAnimeList.set(id, animeData.title)

      const slicedAnilistUrl = animeData.anilist_url?.slice('https://anilist.co/anime/'.length)

      const imageUrl = animeData.image_portrait_url
      const imageFetchUrl =
        imageUrl.startsWith('https://cdn.myanimelist.net') && imageUrl.endsWith('l.jpg')
          ? imageUrl.slice(0, -5) + '.webp'
          : imageUrl
      const ext = extension(imageFetchUrl)

      if (!imageList.has(animeData.id + '.' + ext)) {
        imageResponsePromiseMap.set(
          imageFetchUrl,
          limitRequest(async () => [ext, await ky.get(imageFetchUrl, { throwHttpErrors: false })]),
        )
      }

      animeDataList.push({
        id,
        anilistId: parseNumber(slicedAnilistUrl),
        title: animeData.title,
        totalEpisodes: animeData.total_episodes,
        airedFrom: parseKuramanimeDate(animeData.aired_from),
        airedTo: animeData.aired_to ? parseKuramanimeDate(animeData.aired_to) : null,
        score: animeData.score,
        rating: animeData.rating?.slice(0, animeData.rating.indexOf(' ')),
        duration,
        type: animeData.type,
        imageUrl: imageFetchUrl,
        isVisible: true,
        updatedAt: now,
      })

      for (const post of animeData.posts) {
        if (post.type !== 'Episode' || post.episode_decimal === null) {
          continue
        }

        episodeList.push({
          animeId: id,
          number: parseInt(post.episode_decimal),
        })
      }
    }

    const insertedAnimeList = await db
      .insert(anime)
      .values(animeDataList)
      .returning({ id: anime.id, imageUrl: anime.imageUrl })

    db.insert(animeMetadata).values(animeMetadataList).execute()
    db.insert(episodes).values(episodeList).execute()

    if (populateGenrePromise) {
      await populateGenrePromise
      populateGenrePromise = null
    }

    const hasImages = new Set<number>()

    for (const animeData of insertedAnimeList) {
      imageResponsePromiseMap.get(animeData.imageUrl!)?.then(([ext, response]) => {
        if (response.ok || response.status === 304) {
          Bun.write(imageDirPath + animeData.id + '.' + ext, response)

          hasImages.add(animeData.id)
        }
      })

      fetchAndUpdate(animeData, {
        updateImage: !hasImages.has(animeData.id) || extension(animeData.imageUrl ?? '') !== 'webp',
        priority: 0,
      })
    }
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

const updateIncompleteAnimeData = async (imageDirPath: string) => {
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
          ext !== 'webp' || (await Bun.file(imageDirPath + animeData.id + '.' + ext).exists()),
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
