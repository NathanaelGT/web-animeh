import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { animeVideoRealDirPath, glob } from '~s/utils/path'
import { generateEmitKey, downloadEpisode } from '~s/external/api/kuramanime/download'
import { downloadProgress, downloadProgressSnapshot } from '~s/external/download/progress'
import { updateEpisode } from '~s/anime/episode/update'
import { picker } from '~/shared/utils/object'
import type { EpisodeList } from '~s/db/repository/episode'

export const PosterRouter = router({
  episodeList: procedure.input(v.parser(v.number())).query(async ({ ctx, input }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      columns: { id: true, title: true, episodeUpdatedAt: true },
      where: (anime, { eq }) => eq(anime.id, input),
    })

    if (!animeData) {
      throw new Error('404')
    }

    const episodeList = await new Promise<EpisodeList>(resolve => {
      updateEpisode(animeData, {}, resolve)
    })

    return episodeList.map(picker('number', 'downloadStatus'))
  }),

  download: procedure
    .input(v.parser(v.object({ animeId: v.number(), episodeNumber: v.number() })))
    .mutation(async ({ ctx, input }) => {
      const animeData = await ctx.db.query.anime.findFirst({
        columns: { id: true, title: true, totalEpisodes: true },
        where: (anime, { eq }) => eq(anime.id, input.animeId),
        with: {
          metadata: {
            columns: { providerId: true, providerSlug: true },
            limit: 1,
          },
        },
      })

      if (!animeData) {
        throw new Error('404')
      } else if (!animeData.metadata[0]?.providerSlug) {
        throw new Error('invalid provider slug')
      }

      return downloadEpisode(animeData, animeData.metadata[0], input.episodeNumber)
    }),

  downloadAll: procedure.input(v.parser(v.number())).mutation(async ({ ctx, input }) => {
    const [animeData, downloadedEpisodeList] = await Promise.all([
      ctx.db.query.anime.findFirst({
        columns: { id: true, title: true, totalEpisodes: true },
        where: (anime, { eq }) => eq(anime.id, input),
        with: {
          metadata: {
            columns: { providerId: true, providerSlug: true },
            limit: 1,
          },
        },
      }),

      animeVideoRealDirPath(input).then(videoRealDir => {
        return videoRealDir
          ? glob(videoRealDir, '*.mp4').then(episodes => {
              const downloadedEpisodeList: number[] = []

              for (const episodeFilename of episodes) {
                const episodeNo = episodeFilename.match(/(\d+).mp4/)?.[1]
                if (episodeNo) {
                  downloadedEpisodeList.push(parseInt(episodeNo))
                }
              }

              return downloadedEpisodeList
            })
          : []
      }),
    ])

    if (!animeData) {
      throw new Error('404')
    } else if (!animeData.metadata[0]?.providerSlug) {
      throw new Error('invalid provider slug')
    }

    downloadProgressSnapshot.forEach((_, key) => {
      const [title, episode] = key.split(': Episode ')

      if (title === animeData.title) {
        downloadedEpisodeList.push(episode ? parseInt(episode) : 1)
      }
    })

    const episodes = await ctx.db.query.episodes.findMany({
      columns: { number: true },
      where: (episodes, { and, eq, not, inArray }) => {
        return and(
          eq(episodes.animeId, input),
          not(inArray(episodes.number, downloadedEpisodeList)),
        )
      },
      orderBy: (episodes, { asc }) => asc(episodes.number),
    })

    for (const episode of episodes) {
      downloadProgress.emit(generateEmitKey(animeData, episode.number), {
        text: 'Menginisialisasi proses unduhan',
      })
    }

    ;(async () => {
      for (const episode of episodes) {
        await downloadEpisode(animeData, animeData.metadata[0]!, episode.number)
      }
    })()

    return episodes.length
  }),
})
