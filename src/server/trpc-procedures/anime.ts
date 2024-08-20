import { observable } from '@trpc/server/observable'
import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { glob, animeVideoRealDirPath } from '~s/utils/path'
import { downloadProgress, downloadProgressSnapshot } from '~s/external/download/progress'

export const AnimeRouter = router({
  episodes: procedure.input(v.parser(v.number())).subscription(async ({ ctx, input }) => {
    const [animeData, downloadedEpisodePaths] = await Promise.all([
      ctx.db.query.anime.findFirst({
        columns: { title: true },
        where: (anime, { eq }) => eq(anime.id, input),
      }),

      animeVideoRealDirPath(input).then(videoRealDir => {
        return videoRealDir ? glob(videoRealDir, '*.mp4') : []
      }),
    ])

    if (!animeData) {
      throw new Error('404')
    }

    const episodeList: Record<number, string | true> = {}
    const downloadedEpisodePathSliceAt = (downloadedEpisodePaths[0]?.lastIndexOf('/') ?? 0) + 1
    for (const downloadedEpisodePath of downloadedEpisodePaths) {
      const episodePath = downloadedEpisodePath.slice(downloadedEpisodePathSliceAt)

      episodeList[parseInt(episodePath)] = true
    }

    return observable<typeof episodeList>(emit => {
      const handleUpdate = (data: { text: string; done?: boolean }, name: string) => {
        if (!name.startsWith(animeData.title + ': Episode ')) {
          return false
        }

        const episodeNumber = parseInt(name.slice(name.indexOf('Episode ') + 'Episode '.length))

        episodeList[episodeNumber] = data.text

        if (data.done) {
          setTimeout(() => {
            episodeList[episodeNumber] = true

            emit.next(episodeList)
          }, 250)
        }

        return true
      }

      downloadProgressSnapshot.forEach(handleUpdate)

      emit.next(episodeList)

      downloadProgress.on('*', (name, data) => {
        if (handleUpdate(data, name)) {
          emit.next(episodeList)
        }
      })
    })
  }),
})
