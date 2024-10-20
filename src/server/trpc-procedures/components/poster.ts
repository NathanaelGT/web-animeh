import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { animeVideoRealDirPath, glob } from '~s/utils/path'
import { downloadEpisode } from '~s/external/api/kuramanime/download'
import { downloadProgressSnapshot } from '~s/external/download/progress'
import { isMoreThanOneDay } from '~s/utils/time'
import { updateEpisode } from '~s/anime/episode/update'

export const PosterRouter = router({
  episodeList: procedure.input(v.parser(v.number())).query(async ({ ctx, input }) => {
    const videoRealDirPromise = animeVideoRealDirPath(input)

    const animeData = await ctx.db.query.anime.findFirst({
      columns: { id: true, title: true, episodeUpdatedAt: true },
      where: (anime, { eq }) => eq(anime.id, input),
    })

    if (!animeData) {
      throw new Error('404')
    }

    const [episodeList, downloadedEpisodeList] = await Promise.all([
      isMoreThanOneDay(animeData.episodeUpdatedAt)
        ? updateEpisode(animeData)
        : ctx.db.query.episodes.findMany({
            columns: { number: true },
            where: (episodes, { eq }) => eq(episodes.animeId, input),
          }),

      videoRealDirPromise.then(videoRealDir => {
        return videoRealDir ? glob(videoRealDir, '*.mp4') : []
      }),
    ])

    const downloadCompleted = new Map<number, boolean>()
    for (const episode of downloadedEpisodeList) {
      // bentuk episode: "01.mp4" atau "01_.mp4"
      downloadCompleted.set(parseInt(episode), !episode.includes('_'))
    }

    downloadProgressSnapshot.forEach((_, key) => {
      const [title, episode] = key.split(': Episode ') as [string, string | undefined]

      if (title === animeData.title) {
        downloadCompleted.set(episode ? parseInt(episode) : 1, false)
      }
    })

    return episodeList.map(({ number }) => [number, downloadCompleted.get(number)] as const)
  }),

  download: procedure
    .input(v.parser(v.object({ animeId: v.number(), episodeNumber: v.number() })))
    .mutation(async ({ ctx, input }) => {
      const animeData = await ctx.db.query.anime.findFirst({
        columns: { title: true, totalEpisodes: true },
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

      return await downloadEpisode(
        { id: input.animeId, title: animeData.title, totalEpisodes: animeData.totalEpisodes },
        animeData.metadata[0],
        input.episodeNumber,
      )
    }),

  downloadAll: procedure.input(v.parser(v.number())).mutation(async ({ ctx, input }) => {
    const [animeData, downloadedEpisodeList] = await Promise.all([
      ctx.db.query.anime.findFirst({
        columns: { title: true, totalEpisodes: true },
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
      const [title, episode] = key.split(': Episode ') as [string, string | undefined]

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

    ;(async () => {
      for (const episode of episodes) {
        await downloadEpisode(
          { id: input, title: animeData.title, totalEpisodes: animeData.totalEpisodes },
          animeData.metadata[0]!,
          episode.number,
        )
      }
    })()

    return episodes.length
  }),
})
