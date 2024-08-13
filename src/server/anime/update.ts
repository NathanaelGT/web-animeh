import path from 'path'
import { eq } from 'drizzle-orm'
import { db } from '~s/db'
import { basePath } from '~s/utils/path'
import { anime } from '~s/db/schema'
import { limitRequest } from '~s/external/limit'
import { extension } from '~/shared/utils/file'
import { jikanClient } from '~s/external/api/jikan'
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
    synopsis: jikanAnimeData.synopsis,
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
  localAnimeId: number,
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
    const request = limitRequest(() => fetch(url))
    const ext = extension(url)

    updateData.imageUrl = url
    updateData.imageExtension = ext

    promises.push(
      (async () => {
        await Bun.write(imageDir + localAnimeId + '.' + ext, await request)
      })(),
    )
  }

  promises.push(db.update(anime).set(updateData).where(eq(anime.id, localAnimeId)).execute())

  await Promise.all(promises)

  return updateData
}

export const fetchAndUpdate = async <TConfig extends UpdateConfig>(
  localAnime: Pick<Anime, 'id'>,
  config: TConfig = {} as TConfig,
) => {
  const { data } = await jikanClient.anime.getAnimeFullById(localAnime.id)

  return await update(localAnime.id, data, config)
}
