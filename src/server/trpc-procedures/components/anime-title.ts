import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import { getKuramanimeOrigin } from '~/server/ky'

export const AnimeTitleRouter = router({
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

    const kuramanimeUrlWithoutSlug = metadata
      ? `${kuramanimeOrigin}anime/${metadata.providerId}`
      : null

    return {
      kuramanimeUrl: kuramanimeUrlWithoutSlug
        ? metadata?.providerSlug
          ? kuramanimeUrlWithoutSlug + '/' + metadata.providerSlug
          : kuramanimeUrlWithoutSlug
        : undefined,
    }
  }),
})
