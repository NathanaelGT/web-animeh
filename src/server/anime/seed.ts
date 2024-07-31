import path from 'path'
import { db } from '~s/db'
import { anime, animeMetadata } from '~s/db/schema'
import { basePath } from '~s/utils/path'
import { parseNumber } from '~/shared/utils/number'
import { fetchAll } from '~s/external/api/kuramanime'
import { limitRequest } from '~s/external/limit'

export const seed = async () => {
  const firstAnime = await db.query.anime.findFirst({ columns: { id: true } })
  if (firstAnime === undefined) {
    populate()
  }
}

export const populate = async () => {
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

  const parseDurationRegex = new RegExp(
    '[^0-9]*(?:([0-9]+)jam)?(?:([0-9]+)(?:menit|mnt))?(?:([0-9]+)detik|dtk)?.*',
    'i',
  )
  const parseDuration = (duration: string | null | undefined) => {
    duration = duration?.trim()
    if (!duration) {
      return null
    }

    const [, hours, minutes, seconds] = duration
      .replaceAll(' ', '')
      .toLowerCase()
      .match(parseDurationRegex)!

    return Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)
  }

  const normalizeRating = (rating: string | null) => {
    if (rating === 'G - Segala Usia') {
      return 'G - Semua Usia'
    }

    return rating
  }

  const imageDirPath = path.join(basePath, 'images/')

  const imageResponsePromiseMap = new Map<string, Promise<Response>>()

  let id = 0

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

      const duration = parseDuration(animeData.duration)
      if (typeof duration === 'number' && duration < 301) {
        continue
      }

      const slicedMalUrl = animeData.mal_url!.slice('https://myanimelist.net/anime/'.length)
      const slicedAnilistUrl = animeData.anilist_url?.slice('https://anilist.co/anime/'.length)

      const imageUrl = animeData.image_portrait_url
      const imageFetchUrl =
        imageUrl.startsWith('https://cdn.myanimelist.net') && imageUrl.endsWith('l.jpg')
          ? imageUrl.slice(0, -5) + '.webp'
          : imageUrl

      imageResponsePromiseMap.set(
        imageUrl,
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
        rating: normalizeRating(animeData.rating),
        duration,
        type: animeData.type,
        imageUrl: animeData.image_portrait_url,
      })
    }

    const insertedAnimeList = await db
      .insert(anime)
      .values(animeDataList)
      .returning({ id: anime.id, imageUrl: anime.imageUrl })

    db.insert(animeMetadata).values(animeMetadataList).execute()

    for (const animeData of insertedAnimeList) {
      if (animeData.imageUrl === null) {
        return
      }

      const request = imageResponsePromiseMap.get(animeData.imageUrl)
      if (request === undefined) {
        return
      }

      const response = await request
      if (response.status === 404) {
        return
      }

      const extension = response.url.slice(response.url.lastIndexOf('.'))
      const fileName = animeData.id + extension

      Bun.write(imageDirPath + fileName, response)
    }
  })
}
