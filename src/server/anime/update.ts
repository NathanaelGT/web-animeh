import path from 'path'
import fs from 'fs/promises'
import { eq, sql } from 'drizzle-orm'
import { db } from '~s/db'
import { basePath } from '~s/utils/path'
import { anime } from '~s/db/schema'
import { limitRequest } from '~s/external/limit'
import { extension } from '~/shared/utils/file'
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
type LocalAnime = Required<Pick<Anime, 'id' | 'malId'>> &
  Partial<Pick<Anime, 'imageUrl' | 'updatedAt'>>
type UpdateConfig = Partial<{
  updateImage: boolean
}>

export const update = async (
  jikanAnimeData: JikanAnime,
  localAnimeData: LocalAnime,
  config?: UpdateConfig,
) => {
  const promises: Promise<unknown>[] = []

  const updateData: SQLiteUpdateSetSource<typeof anime> = {
    updatedAt: new Date(),
    japaneseTitle: jikanAnimeData.title_japanese,
    englishTitle: jikanAnimeData.title_english,
    synopsis: sql`coalesce(${anime.synopsis}, ${jikanAnimeData.synopsis})`,
    totalEpisodes: jikanAnimeData.episodes,
    airedFrom: new Date(jikanAnimeData.aired.from),
    airedTo: jikanAnimeData.aired.to ? new Date(jikanAnimeData.aired.to) : null,
    score: jikanAnimeData.score,
    rating: jikanAnimeData.rating.slice(0, jikanAnimeData.rating.indexOf(' ')),
    duration: sql`coalesce(${anime.duration}, ${parseMalDuration(jikanAnimeData.duration)})`,
  }

  if (config?.updateImage) {
    const url = jikanAnimeData.images.webp?.image_url || jikanAnimeData.images.jpg.image_url
    const ext = extension(url)

    updateData.imageUrl = url
    updateData.imageExtension = ext

    const response = await limitRequest(() => fetch(url))
    const imagePath = imageDir + localAnimeData.id + '.' + ext

    promises.push(Bun.write(imagePath, response))

    if (localAnimeData.imageUrl) {
      const oldPosterPath = imageDir + localAnimeData.id + '.' + extension(localAnimeData.imageUrl)

      if (oldPosterPath !== imagePath) {
        promises.push(fs.rm(oldPosterPath))
      }
    }
  }

  promises.push(db.update(anime).set(updateData).where(eq(anime.id, localAnimeData.id)).execute())

  await Promise.all(promises)

  return updateData
}
