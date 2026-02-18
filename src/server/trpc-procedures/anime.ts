import { observable } from '@trpc/server/observable'
import * as v from 'valibot'
import * as episodeRepository from '~s/db/repository/episode'
import { procedure, router } from '~s/trpc'
import { episodeMitt } from '~s/anime/episode/event'
import {
  downloadProgress,
  downloadProgressSnapshot,
  type DownloadProgressData,
} from '~s/external/download/progress'
import { searchEpisode } from '~/shared/utils/episode'
import * as downloadText from '~/shared/anime/episode/downloadText'

export const AnimeRouter = router({
  episodes: procedure.input(v.parser(v.number())).subscription(async ({ ctx, input: animeId }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      columns: { id: true, title: true },
      where: (anime, { eq }) => eq(anime.id, animeId),
    })

    if (!animeData) {
      throw new Error('404')
    }

    let episodeList = await episodeRepository.findByAnime(animeData)

    const updateStatus = (
      episodeNumber: number,
      data: DownloadProgressData | { status: 'DOWNLOADED' },
    ) => {
      const episode = searchEpisode(episodeList, episodeNumber)

      if (episode) {
        episode.download = data
      }
    }

    return observable<episodeRepository.EpisodeList>(emit => {
      emit.next(episodeList)

      const episodeUpdateHandler = (newEpisodeList: episodeRepository.EpisodeList) => {
        for (const episode of newEpisodeList) {
          const oldEpisode = searchEpisode(episodeList, episode.number)

          if (oldEpisode) {
            episode.download = oldEpisode.download
          }
        }

        if (!Bun.deepEquals(episodeList, newEpisodeList)) {
          episodeList = newEpisodeList

          emit.next(episodeList)
        }
      }

      const handleUpdate = (data: DownloadProgressData, name: string) => {
        if (!(name === animeData.title || name.startsWith(animeData.title + ': Episode '))) {
          return false
        }

        const episodeIndex = name.lastIndexOf('Episode ')
        const episodeNumber =
          episodeIndex > -1 ? parseInt(name.slice(episodeIndex + 'Episode '.length)) : 1

        updateStatus(episodeNumber, data)

        if (data.done) {
          setTimeout(() => {
            updateStatus(episodeNumber, {
              status: 'OTHER',
              text: downloadText.FINISH,
              done: true,
            })

            emit.next(episodeList)

            setTimeout(() => {
              updateStatus(episodeNumber, {
                status: 'DOWNLOADED',
              })

              emit.next(episodeList)
            }, 100)
          }, 100)
        }

        return true
      }

      const downloadProgressHandler = (name: string, data: DownloadProgressData) => {
        if (handleUpdate(data, name)) {
          emit.next(episodeList)
        }
      }

      episodeMitt.on(animeId.toString(), episodeUpdateHandler)

      downloadProgress.on('*', downloadProgressHandler)

      downloadProgressSnapshot.forEach(handleUpdate)

      return () => {
        episodeMitt.off(animeId.toString(), episodeUpdateHandler)

        downloadProgress.off('*', downloadProgressHandler)
      }
    })
  }),
})
