import path from 'path'
import { db } from '~s/db'
import {
  anime,
  animeMetadata,
  animeToGenres,
  genres,
  animeToStudios,
  studios,
  animeSynonyms,
  studioSynonyms,
} from '~s/db/schema'
import { basePath, glob } from '~s/utils/path'
import { parseNumber } from '~/shared/utils/number'
import { fetchAll } from '~s/external/api/kuramanime'
import { limitRequest } from '~s/external/limit'
import { jikanClient, producerClient, jikanQueue } from '~s/external/api/jikan'
import { extension } from '~/shared/utils/file'
import { update } from './update'

export const seed = async () => {
  const firstAnime = await db.query.anime.findFirst({ columns: { id: true } })
  if (firstAnime === undefined) {
    populate()
  }
}

export const populate = async () => {
  const imageDirPath = path.join(basePath, 'images/')

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

  const imageResponsePromiseMap = new Map<string, Promise<[string, Response]>>()

  const now = new Date()

  const imageList = new Set(await imageListPromise)
  const storedAnimeList = new Set<number>()

  fetchAll(async animeList => {
    const animeDataList: (typeof anime.$inferInsert)[] = []
    const animeMetadataList: (typeof animeMetadata.$inferInsert)[] = []

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

      animeMetadataList.push({
        animeId: id,
        provider: 'kuramanime',
        providerId: animeData.id,
        providerSlug: animeData.slug,
      })

      // kadang ada yang duplikat, misalnya untuk versi uncensored
      if (storedAnimeList.has(id)) {
        continue
      }
      storedAnimeList.add(id)

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
          limitRequest(async () => [ext, await fetch(imageFetchUrl)]),
        )
      }

      animeDataList.push({
        id,
        anilistId: parseNumber(slicedAnilistUrl),
        title: animeData.title,
        synopsis: animeData.synopsis,
        totalEpisodes: animeData.total_episodes,
        airedFrom: parseKuramanimeDate(animeData.aired_from),
        airedTo: animeData.aired_to ? parseKuramanimeDate(animeData.aired_to) : null,
        score: animeData.score,
        rating: animeData.rating?.slice(0, animeData.rating.indexOf(' ')),
        duration,
        type: animeData.type,
        imageUrl: imageFetchUrl,
        imageExtension: ext,
        updatedAt: now,
      })
    }

    const insertedAnimeList = await db
      .insert(anime)
      .values(animeDataList)
      .returning({ id: anime.id, imageUrl: anime.imageUrl })

    db.insert(animeMetadata).values(animeMetadataList).execute()

    if (populateGenrePromise) {
      await populateGenrePromise
      populateGenrePromise = null
    }

    const hasImages = new Set<number>()

    for (const animeData of insertedAnimeList) {
      jikanQueue.add(async () => {
        const { data } = await jikanClient.anime.getAnimeFullById(animeData.id)

        // ada beberapa sinonim yang duplikat, judulnya sama persis, cuma beda "type"
        const synonymList: (typeof animeSynonyms.$inferInsert)[] = []
        const existingSynonyms = new Set<string>([data.titles[0]!.title])
        for (let i = 1; i < data.titles.length; i++) {
          const { title, type } = data.titles[i]!
          if (existingSynonyms.has(title)) {
            continue
          }

          existingSynonyms.add(title)
          synonymList.push({
            animeId: animeData.id,
            synonym: title,
            type,
          })
        }

        if (synonymList.length) {
          db.insert(animeSynonyms).values(synonymList).execute()
        }

        const genreList: (typeof animeToGenres.$inferInsert)[] = [
          data.genres,
          data.explicit_genres,
          data.themes,
          data.demographics,
        ].flatMap(genreList => {
          return genreList.map(genre => ({
            animeId: animeData.id,
            genreId: genre.mal_id,
          }))
        })

        if (genreList.length) {
          db.insert(animeToGenres).values(genreList).execute()
        }

        const existingCombination = new Set<string>()
        const studioList: (typeof animeToStudios.$inferInsert)[] = (
          [
            [data.studios, 'studio'],
            [data.producers, 'producer'],
          ] as const
        ).flatMap(([studioList, type]) => {
          const filteredStudioList: (typeof animeToStudios.$inferInsert)[] = []

          for (const studio of studioList) {
            // entah kenapa ada beberapa yang duplikat
            const key = animeData.id + type + studio.mal_id
            if (existingCombination.has(key)) {
              continue
            }

            existingCombination.add(key)

            filteredStudioList.push({
              animeId: animeData.id,
              studioId: studio.mal_id,
              type,
            })
          }

          return filteredStudioList
        })

        if (studioList.length) {
          db.insert(animeToStudios).values(studioList).execute()
        }

        update(animeData.id, data, {
          updateImage:
            !hasImages.has(animeData.id) || extension(animeData.imageUrl ?? '') !== 'webp',
        })
      })

      imageResponsePromiseMap.get(animeData.imageUrl!)?.then(([ext, response]) => {
        if (response.ok || response.status === 304) {
          Bun.write(imageDirPath + animeData.id + '.' + ext, response)

          hasImages.add(animeData.id)
        }
      })
    }
  })

  const registeredStudios = new Set<number>()

  const fetchStudio = (page: number) => {
    jikanQueue.add(
      async () => {
        const producers = await producerClient.getProducers({
          page,
          order_by: 'count',
          sort: 'desc',
        })

        if (producers.pagination.has_next_page) {
          // https://jikan.docs.apiary.io/#introduction/information/rate-limiting
          setTimeout(() => {
            fetchStudio(page + 1)
          }, 4000)
        }

        type Synonym = (typeof producers.data)[number]['titles'][number]
        const synonymsMap = new Map<number, Synonym[]>()

        const studioList: (typeof studios.$inferInsert)[] = []
        for (const producer of producers.data) {
          // ada data duplikat dari jikan
          if (registeredStudios.has(producer.mal_id)) {
            continue
          }

          registeredStudios.add(producer.mal_id)

          const synonyms = producer.titles.slice(1)
          if (synonyms.length) {
            synonymsMap.set(producer.mal_id, synonyms)
          }

          const imageUrl = producer.images.jpg.image_url

          studioList.push({
            id: producer.mal_id,
            name: producer.titles[0]!.title,
            imageUrl:
              imageUrl === 'https://cdn.myanimelist.net/images/company_no_picture.png'
                ? null
                : imageUrl,
            establishedAt: producer.established ? new Date(producer.established) : null,
          })
        }

        db.insert(studios).values(studioList).execute()

        const synonymList: (typeof studioSynonyms.$inferInsert)[] = []
        for (const [producerId, synonyms] of synonymsMap) {
          for (const { title, type } of synonyms) {
            synonymList.push({
              studioId: producerId,
              synonym: title,
              type,
            })
          }
        }

        if (synonymList.length) {
          db.insert(studioSynonyms).values(synonymList).execute()
        }
      },
      { priority: 1 },
    )
  }

  fetchStudio(1)
}
