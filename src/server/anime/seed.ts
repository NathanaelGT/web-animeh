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
} from '~s/db/schema'
import { basePath } from '~s/utils/path'
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

  const normalizeKuramanimeRating = (rating: string | null) => {
    if (rating === 'G - Segala Usia') {
      return 'G - Semua Usia'
    }

    return rating
  }

  const imageDirPath = path.join(basePath, 'images/')

  const imageResponsePromiseMap = new Map<string, Promise<Response>>()

  let id = 0

  const now = new Date()

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
      const slicedAnilistUrl = animeData.anilist_url?.slice('https://anilist.co/anime/'.length)

      const imageUrl = animeData.image_portrait_url
      const imageFetchUrl =
        imageUrl.startsWith('https://cdn.myanimelist.net') && imageUrl.endsWith('l.jpg')
          ? imageUrl.slice(0, -5) + '.webp'
          : imageUrl

      imageResponsePromiseMap.set(
        imageFetchUrl,
        limitRequest(() => fetch(imageFetchUrl)),
      )

      ++id

      animeMetadataList.push({
        animeId: id,
        provider: 'kuramanime',
        providerId: animeData.id,
      })

      animeDataList.push({
        id,
        malId: parseNumber(slicedMalUrl?.slice(0, slicedMalUrl.indexOf('/'))),
        anilistId: parseNumber(slicedAnilistUrl),
        title: animeData.title,
        synopsis: animeData.synopsis,
        totalEpisodes: animeData.total_episodes,
        airedFrom: parseKuramanimeDate(animeData.aired_from),
        airedTo: animeData.aired_to ? parseKuramanimeDate(animeData.aired_to) : null,
        score: animeData.score,
        rating: normalizeKuramanimeRating(animeData.rating),
        duration,
        type: animeData.type,
        imageUrl: imageFetchUrl,
        imageExtension: extension(imageFetchUrl),
        updatedAt: now,
      })
    }

    const insertedAnimeList = await db
      .insert(anime)
      .values(animeDataList)
      .returning({ id: anime.id, malId: anime.malId, imageUrl: anime.imageUrl })

    db.insert(animeMetadata).values(animeMetadataList).execute()

    if (populateGenrePromise) {
      await populateGenrePromise
      populateGenrePromise = null
    }

    const hasImages = new Set<number>()

    for (const animeData of insertedAnimeList) {
      const { malId: animeMalId } = animeData

      if (animeMalId) {
        jikanQueue.add(async () => {
          const { data } = await jikanClient.anime.getAnimeFullById(animeMalId)

          const synonymList = data.titles.slice(1).map(({ title, type }) => {
            return {
              animeId: animeMalId,
              synonym: title,
              type,
            } satisfies typeof animeSynonyms.$inferInsert
          })

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
              animeId: animeMalId,
              genreId: genre.mal_id,
            }))
          })

          if (genreList.length) {
            db.insert(animeToGenres).values(genreList).execute()
          }

          const studioList: (typeof animeToStudios.$inferInsert)[] = (
            [
              [data.studios, 'studio'],
              [data.producers, 'producer'],
            ] as const
          ).flatMap(([studioList, type]) => {
            return studioList.map(studio => ({
              animeId: animeMalId,
              studioId: studio.mal_id,
              type,
            }))
          })

          if (studioList.length) {
            db.insert(animeToStudios).values(studioList).execute()
          }

          update(data, animeData, {
            updateImage:
              !hasImages.has(animeMalId) || extension(animeData.imageUrl ?? '') !== 'webp',
          })
        })
      }

      imageResponsePromiseMap.get(animeData.imageUrl!)?.then(response => {
        if (response.ok || response.status === 304) {
          const ext = extension(response.url)
          const posterPath = imageDirPath + animeData.id + '.' + ext

          Bun.write(posterPath, response)

          hasImages.add(animeData.id)
        }
      })
    }
  })

  const fetchStudio = async (page: number) => {
    const producers = await producerClient.getProducers({ page })

    if (producers.pagination.has_next_page) {
      // https://jikan.docs.apiary.io/#introduction/information/rate-limiting
      setTimeout(() => {
        fetchStudio(page + 1)
      }, 4000)
    }

    await db.insert(studios).values(
      producers.data.map(producer => {
        return {
          id: producer.mal_id,
          name: producer.titles[0]!.title,
          imageUrl: producer.images.jpg.image_url,
          establishedAt: producer.established ? new Date(producer.established) : null,
        } satisfies typeof studios.$inferInsert
      }),
    )
  }

  fetchStudio(1)
}