import { observable } from '@trpc/server/observable'
import * as v from 'valibot'
import * as episodeRepository from '~s/db/repository/episode'
import { procedure, router } from '~s/trpc'
import { searchEpisode } from '~/shared/utils/episode'
import {
  downloadProgress,
  downloadProgressSnapshot,
  type DownloadProgressData,
} from '~s/external/download/progress'

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

    const updateStatus = (episodeNumber: number, status: string | boolean) => {
      const episode = searchEpisode(episodeList, episodeNumber)

      if (episode) {
        episode.downloadStatus = status
      }
    }

    return observable<episodeRepository.EpisodeList>(emit => {
      emit.next(episodeList)

      const handleUpdate = (data: { text: string; done?: boolean }, name: string) => {
        if (!(name === animeData.title || name.startsWith(animeData.title + ': Episode '))) {
          return false
        }

        const episodeIndex = name.lastIndexOf('Episode ')
        const episodeNumber =
          episodeIndex > -1 ? parseInt(name.slice(episodeIndex + 'Episode '.length)) : 1

        updateStatus(episodeNumber, data.text)

        if (data.done) {
          setTimeout(() => {
            updateStatus(episodeNumber, true)

            emit.next(episodeList)
          }, 250)
        }

        return true
      }

      const downloadProgressHandler = (name: string, data: DownloadProgressData) => {
        if (handleUpdate(data, name)) {
          emit.next(episodeList)
        }
      }

      downloadProgress.on('*', downloadProgressHandler)

      downloadProgressSnapshot.forEach(handleUpdate)

      return () => {
        downloadProgress.off('*', downloadProgressHandler)
      }
    })
  }),
})
