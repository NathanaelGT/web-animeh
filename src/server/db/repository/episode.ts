import { and, eq, sql } from 'drizzle-orm'
import { db } from '~s/db'
import { providerEpisodes, episodes, type anime } from '~s/db/schema'
import { animeVideoRealDirPath, glob } from '~s/utils/path'
import { searchEpisode } from '~/shared/utils/episode'
import { omit } from '~/shared/utils/object'
import { downloadProgressSnapshot, type DownloadProgressData } from '~s/external/download/progress'

export type DownloadProgressDataWithoutDone = DownloadProgressData extends infer U
  ? U extends any
    ? Omit<U, 'done'>
    : never
  : never

type Download =
  | {
      status: 'NOT_DOWNLOADED' | 'RESUME'
    }
  | {
      status: 'DOWNLOADED'
      text?: string
    }
  | DownloadProgressDataWithoutDone

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
        download: sql`0`
          .mapWith(
            (): Download => ({
              status: 'NOT_DOWNLOADED',
            }),
          )
          .as('download'),
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
      episode.download.status = episodePath.includes('_') ? 'RESUME' : 'DOWNLOADED'
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
      if (data.done) {
        episode.download = {
          status: 'DOWNLOADED',
          text: data.text,
        }
      } else {
        episode.download = omit(data, 'done') as DownloadProgressDataWithoutDone
      }
    }
  })

  return episodeList
}

export type EpisodeList = Awaited<ReturnType<typeof findByAnime>>
