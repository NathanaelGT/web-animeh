import z from 'zod'
import { procedure, router } from '~s/trpc'
import { videosDirPath, glob } from '~s/utils/path'
import { downloadEpisode } from '~s/external/api/kuramanime/download'
import { isMoreThanOneDay } from '~s/utils/time'
import { updateEpisode } from '~s/anime/episode/update'

export const PosterRouter = router({
  episodeList: procedure.input(z.number()).query(async ({ ctx, input }) => {
    const downloadedEpisodeListPromise = glob(videosDirPath + input, '*.mp4')

    const animeData = await ctx.db.query.anime.findFirst({
      columns: { id: true, episodeUpdatedAt: true },
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

      downloadedEpisodeListPromise,
    ])

    const downloaded = new Set<number>()
    for (const episode of downloadedEpisodeList) {
      // bentuk episode: "01.mp4"
      downloaded.add(parseInt(episode))
    }

    return episodeList.map(({ number }) => [number, downloaded.has(number)] as const)
  }),

  download: procedure
    .input(z.object({ animeId: z.number(), episodeNumber: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const animeData = await ctx.db.query.anime.findFirst({
        columns: { title: true },
        where: (anime, { eq }) => eq(anime.id, input.animeId),
        with: {
          metadata: {
            columns: { providerId: true, providerSlug: true },
          },
        },
      })

      if (!animeData) {
        throw new Error('404')
      } else if (!animeData.metadata.providerSlug) {
        throw new Error('invalid provider slug')
      }

      return await downloadEpisode(
        { id: input.animeId, title: animeData.title },
        animeData.metadata,
        input.episodeNumber,
      )
    }),
})
