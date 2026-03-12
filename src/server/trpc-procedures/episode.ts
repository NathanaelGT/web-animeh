import * as v from 'valibot'
import { procedure, router } from '~s/trpc'

export const EpisodeRouter = router({
  skips: procedure
    .input(v.parser(v.object({ id: v.number(), ep: v.number() })))
    .query(({ ctx, input: { id, ep } }) => {
      return ctx.db.query.episodeSkips.findMany({
        where(episodeSkips, { and, eq }) {
          return and(eq(episodeSkips.animeId, id), eq(episodeSkips.episodeNumber, ep))
        },
        columns: {
          type: true,
          startTime: true,
          endTime: true,
          episodeLength: true,
        },
      })
    }),
})
