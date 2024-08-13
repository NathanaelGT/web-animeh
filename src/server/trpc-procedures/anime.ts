import { observable } from '@trpc/server/observable'
import { z } from 'zod'
import { procedure, router } from '~s/trpc'
import { videosDirPath, glob } from '~s/utils/path'
import { downloadProgress, downloadProgressSnapshot } from '~s/external/download/progress'

export const AnimeRouter = router({
  episodes: procedure.input(z.number()).subscription(async ({ ctx, input }) => {
    const [animeData, downloadedEpisodeList] = await Promise.all([
      ctx.db.query.anime.findFirst({
        columns: { title: true },
        where: (anime, { eq }) => eq(anime.id, input),
      }),
      glob(videosDirPath + input, '*.mp4'),
    ])

    if (!animeData) {
      throw new Error('404')
    }

    const episodeList: Record<number, string | true> = {}
    for (const episode of downloadedEpisodeList) {
      episodeList[parseInt(episode)] = true
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
