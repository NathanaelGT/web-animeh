import * as v from 'valibot'
import { getKuramanimeOrigin } from '~s/ky'
import { procedure, router } from '~s/trpc'
import { omit } from '~/shared/utils/object'

export const AnimeTitleRouter = router({
  preview: procedure.input(v.parser(v.number())).query(async ({ ctx, input }) => {
    const animeData = await ctx.db.query.anime.findFirst({
      where: (anime, { eq }) => eq(anime.id, input),
      columns: {
        synopsis: true,
        totalEpisodes: true,
      },
      with: {
        animeToGenres: {
          columns: {},
          with: {
            genre: {
              columns: {
                name: true,
              },
            },
          },
        },
        providerEpisodes: {
          columns: {
            number: true,
          },
          orderBy: (providerEpisodes, { desc }) => desc(providerEpisodes.number),
          limit: 1,
        },
      },
    })

    if (!animeData) {
      return null
    }

    return {
      ...omit(animeData, 'animeToGenres', 'providerEpisodes'),
      currentEpisode: animeData.providerEpisodes[0]?.number ?? 0,
      genres: animeData.animeToGenres.map(({ genre }) => genre.name),
    }
  }),

  context: procedure.input(v.parser(v.number())).query(async ({ ctx, input }) => {
    const [kuramanimeOrigin, metadata] = await Promise.all([
      getKuramanimeOrigin(),
      ctx.db.query.animeMetadata.findFirst({
        where(animeMetadata, { and, eq }) {
          return and(eq(animeMetadata.animeId, input), eq(animeMetadata.provider, 'kuramanime'))
        },
        columns: {
          providerId: true,
          providerSlug: true,
        },
      }),
    ])

    type Providers = 'Kuramanime'

    const url: { [Key in Providers]?: `https://${string}` } = {}

    if (metadata?.providerSlug) {
      url.Kuramanime = `${kuramanimeOrigin}anime/${metadata.providerId}/${metadata.providerSlug}`
    }

    return { url }
  }),
})
