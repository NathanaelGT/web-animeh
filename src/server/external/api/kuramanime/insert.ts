import ky, { type KyResponse } from 'ky'
import { db } from '~s/db'
import { anime, animeMetadata, providerEpisodes } from '~s/db/schema'
import { limitRequest } from '~s/external/limit'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { imagesDirPath } from '~s/utils/path'
import { parseMalId } from '~s/utils/mal'
import { extension } from '~/shared/utils/file'
import { parseNumber } from '~/shared/utils/number'
import type { Anime } from './fetch'

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

export const insertKuramanimeAnimeListToDb = async (
  animeList: Anime[],
  existingImageList: Set<string>,
  { withCreatedAt }: { withCreatedAt: boolean },
) => {
  type ProviderEpisode = typeof providerEpisodes.$inferInsert

  const animeDataList: (typeof anime.$inferInsert)[] = []
  const animeMetadataList: (typeof animeMetadata.$inferInsert)[] = []
  const providerEpisodeList: ProviderEpisode[] = []

  const imageResponsePromiseMap = new Map<string, Promise<[string, KyResponse]>>()

  const now = new Date()

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

    const id = parseMalId(animeData.mal_url)
    if (isNaN(id)) {
      continue
    }

    animeMetadataList.push({
      animeId: id,
      provider: 'kuramanime',
      providerId: animeData.id,
      providerSlug: animeData.slug,
      providerData: animeData.title,
    })

    const slicedAnilistUrl = animeData.anilist_url?.slice('https://anilist.co/anime/'.length)

    const imageUrl = animeData.image_portrait_url
    const imageFetchUrl =
      imageUrl.startsWith('https://cdn.myanimelist.net') && imageUrl.endsWith('l.jpg')
        ? imageUrl.slice(0, -5) + '.webp'
        : imageUrl
    const ext = extension(imageFetchUrl)

    if (!existingImageList.has(animeData.id + '.' + ext)) {
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
      fetchedAt: now,
    })

    for (const post of animeData.posts) {
      if (post.type !== 'Episode' || post.episode_decimal === null) {
        continue
      }

      const episode: ProviderEpisode = {
        animeId: id,
        provider: 'kuramanime',
        providerId: animeData.id,
        number: parseInt(post.episode_decimal),
      }

      if (withCreatedAt) {
        episode.createdAt = now
      }

      providerEpisodeList.push(episode)
    }
  }

  const insertedAnimeList = animeDataList.length
    ? await db
        .insert(anime)
        .values(animeDataList)
        .onConflictDoUpdate({
          target: anime.id,
          set: buildConflictUpdateColumns(anime, ['anilistId', 'imageUrl', 'isVisible']),
        })
        .returning({ id: anime.id, imageUrl: anime.imageUrl })
    : []

  const promises: Promise<unknown>[] = []

  if (animeMetadataList.length) {
    promises.push(
      db
        .insert(animeMetadata)
        .values(animeMetadataList)
        .onConflictDoUpdate({
          target: [animeMetadata.animeId, animeMetadata.provider, animeMetadata.providerId],
          set: buildConflictUpdateColumns(animeMetadata, ['providerSlug', 'providerData']),
        })
        .execute(),
    )
  }
  if (providerEpisodeList.length) {
    promises.push(
      db
        .insert(providerEpisodes)
        .values(providerEpisodeList)
        .onConflictDoUpdate({
          target: [
            providerEpisodes.animeId,
            providerEpisodes.provider,
            providerEpisodes.providerId,
            providerEpisodes.number,
          ],
          set: buildConflictUpdateColumns(providerEpisodes, ['createdAt']),
        })
        .execute(),
    )
  }

  for (const animeData of insertedAnimeList) {
    const promise = imageResponsePromiseMap
      .get(animeData.imageUrl!)
      ?.then(async ([ext, response]) => {
        if (response.ok || response.status === 304) {
          Bun.write(imagesDirPath + animeData.id + '.' + ext, response)
        }
      })

    if (promise) {
      promises.push(promise)
    }
  }

  await Promise.all(promises)
}
