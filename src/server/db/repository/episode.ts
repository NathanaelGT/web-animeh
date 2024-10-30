import { and, eq, sql } from 'drizzle-orm'
import { db } from '~s/db'
import { providerEpisodes, episodes, type anime } from '~s/db/schema'
import { animeVideoRealDirPath, glob } from '~s/utils/path'
import { searchEpisode } from '~/shared/utils/episode'
import { downloadProgressSnapshot } from '~/server/external/download/progress'

export const findByAnime = async (animeData: Pick<typeof anime.$inferSelect, 'id' | 'title'>) => {
  const [downloadedEpisodePaths, episodeList] = await Promise.all([
    animeVideoRealDirPath(animeData.id).then(videoRealDir => {
      return videoRealDir ? glob(videoRealDir, '*.mp4') : []
    }),

    db
      .select({
        number: providerEpisodes.number,
        title: episodes.title,
        japaneseTitle: episodes.japaneseTitle,
        score: episodes.score,
        romanjiTitle: episodes.romanjiTitle,
        isFiller: episodes.isFiller,
        isRecap: episodes.isRecap,
        downloadStatus: sql`0`
          .mapWith(Boolean as (val: any) => boolean | string)
          .as('downloadStatus'),
        createdAt: providerEpisodes.createdAt,
      })
      .from(episodes)
      .rightJoin(
        providerEpisodes,
        and(
          eq(providerEpisodes.animeId, episodes.animeId),
          eq(providerEpisodes.number, episodes.number),
        ),
      )
      .where(eq(providerEpisodes.animeId, animeData.id))
      .orderBy(providerEpisodes.number),
  ])

  const downloadedEpisodePathSliceAt = (downloadedEpisodePaths[0]?.lastIndexOf('/') ?? 0) + 1
  for (const downloadedEpisodePath of downloadedEpisodePaths) {
    const episodePath = downloadedEpisodePath.slice(downloadedEpisodePathSliceAt)
    const episode = searchEpisode(episodeList, parseInt(episodePath))

    if (episode) {
      episode.downloadStatus = episodePath.includes('_') ? '' : true
    }
  }

  downloadProgressSnapshot.forEach((data, name) => {
    if (!(name === animeData.title || name.startsWith(animeData.title + ': Episode '))) {
      return
    }

    const episodeIndex = name.lastIndexOf('Episode ')
    const episodeNumber =
      episodeIndex > -1 ? parseInt(name.slice(episodeIndex + 'Episode '.length)) : 1

    const episode = searchEpisode(episodeList, episodeNumber)

    if (episode) {
      episode.downloadStatus = data.done || data.text
    }
  })

  return episodeList
}

export type EpisodeList = Awaited<ReturnType<typeof findByAnime>>
