import path from 'path'
import ky from 'ky'
import { eq } from 'drizzle-orm'
import { db } from '~s/db'
import { animeToGenres, animeToStudios, animeSynonyms } from '~s/db/schema'
import { basePath } from '~s/utils/path'
import { anime } from '~s/db/schema'
import { limitRequest } from '~s/external/limit'
import { extension } from '~/shared/utils/file'
import { jikanQueue, jikanClient } from '~s/external/api/jikan'
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core'
import type { Anime as JikanAnime } from '@tutkli/jikan-ts'

const imageDir = path.join(basePath, 'images/')

const parseMalDurationRegex = new RegExp('(?:([0-9]+)hr)?(?:([0-9]+)min)?')
const parseMalDuration = (duration: string | null | undefined) => {
  duration = duration?.replaceAll(' ', '')
  if (!duration) {
    return null
  }

  const [, hours, minutes] = duration.match(parseMalDurationRegex)!

  return Number(hours || 0) * 3600 + Number(minutes || 0) * 60
}

type Anime = typeof anime.$inferSelect
type UpdateConfig = Partial<{
  updateImage: boolean
}>

const basicUpdateData = (jikanAnimeData: JikanAnime) => {
  return {
    updatedAt: new Date(),
    japaneseTitle: jikanAnimeData.title_japanese,
    englishTitle: jikanAnimeData.title_english,
    synopsis: jikanAnimeData.synopsis ?? '', // ada anime yang gapunya sinopsis
    totalEpisodes: jikanAnimeData.episodes,
    airedFrom: new Date(jikanAnimeData.aired.from),
    airedTo: jikanAnimeData.aired.to ? new Date(jikanAnimeData.aired.to) : null,
    score: jikanAnimeData.score,
    rating: jikanAnimeData.rating.slice(0, jikanAnimeData.rating.indexOf(' ')),
    duration: parseMalDuration(jikanAnimeData.duration),
  } satisfies SQLiteUpdateSetSource<typeof anime>
}

type ExtraDataWhenUpdatingImage = { imageUrl: string; imageExtension: string }

export const update = async <TConfig extends UpdateConfig>(
  animeId: number,
  jikanAnimeData: JikanAnime,
  config: TConfig = {} as TConfig,
): Promise<
  ReturnType<typeof basicUpdateData> &
    (TConfig['updateImage'] extends true ? ExtraDataWhenUpdatingImage : {})
> => {
  type TReturn<TUpdateImage extends boolean | undefined> = Awaited<
    ReturnType<typeof update<{ updateImage: TUpdateImage }>>
  >

  const promises: Promise<unknown>[] = []

  const updateData = basicUpdateData(jikanAnimeData) as TReturn<TConfig['updateImage']>

  const updatingImage = (_updateData: any): _updateData is TReturn<true> => {
    return config?.updateImage === true
  }

  if (updatingImage(updateData)) {
    const url = jikanAnimeData.images.webp?.image_url || jikanAnimeData.images.jpg.image_url
    const request = limitRequest(() => ky.get(url))
    const ext = extension(url)

    updateData.imageUrl = url
    updateData.imageExtension = ext

    promises.push(
      (async () => {
        await Bun.write(imageDir + animeId + '.' + ext, await request)
      })(),
    )
  }

  // ada beberapa sinonim yang duplikat, judulnya sama persis, cuma beda "type"
  const synonymList: (typeof animeSynonyms.$inferInsert)[] = []
  const existingSynonyms = new Set<string>([jikanAnimeData.titles[0]!.title])
  for (let i = 1; i < jikanAnimeData.titles.length; i++) {
    const { title, type } = jikanAnimeData.titles[i]!
    if (existingSynonyms.has(title)) {
      continue
    }

    existingSynonyms.add(title)
    synonymList.push({
      animeId: animeId,
      synonym: title,
      type,
    })
  }

  if (synonymList.length) {
    promises.push(db.insert(animeSynonyms).values(synonymList).onConflictDoNothing().execute())
  }

  const genreList: (typeof animeToGenres.$inferInsert)[] = [
    jikanAnimeData.genres,
    jikanAnimeData.explicit_genres,
    jikanAnimeData.themes,
    jikanAnimeData.demographics,
  ].flatMap(genreList => {
    return genreList.map(genre => ({
      animeId: animeId,
      genreId: genre.mal_id,
    }))
  })

  if (genreList.length) {
    promises.push(db.insert(animeToGenres).values(genreList).onConflictDoNothing().execute())
  }

  const existingCombination = new Set<string>()
  const studioList: (typeof animeToStudios.$inferInsert)[] = (
    [
      [jikanAnimeData.studios, 'studio'],
      [jikanAnimeData.producers, 'producer'],
      [jikanAnimeData.licensors, 'licensor'],
    ] as const
  ).flatMap(([studioList, type]) => {
    const filteredStudioList: (typeof animeToStudios.$inferInsert)[] = []

    for (const studio of studioList) {
      // entah kenapa ada beberapa yang duplikat
      const key = animeId + type + studio.mal_id
      if (existingCombination.has(key)) {
        continue
      }

      existingCombination.add(key)

      filteredStudioList.push({
        animeId: animeId,
        studioId: studio.mal_id,
        type,
      })
    }

    return filteredStudioList
  })

  if (studioList.length) {
    promises.push(db.insert(animeToStudios).values(studioList).onConflictDoNothing().execute())
  }

  promises.push(db.update(anime).set(updateData).where(eq(anime.id, animeId)).execute())

  await Promise.all(promises)

  return updateData
}

type FetchAndUpdateConfig = UpdateConfig & { priority?: number }

export const fetchAndUpdate = async <TConfig extends FetchAndUpdateConfig>(
  localAnime: Pick<Anime, 'id'>,
  config: TConfig = {} as TConfig,
) => {
  const { data } = await jikanQueue.add(() => jikanClient.anime.getAnimeFullById(localAnime.id), {
    throwOnTimeout: true,
    priority: config.priority ?? 2,
  })

  return await update(localAnime.id, data, config)
}
