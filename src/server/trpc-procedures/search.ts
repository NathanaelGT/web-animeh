import * as v from 'valibot'
import { procedure } from '~s/trpc'
import { animeSynonyms, animeToGenres, genres } from '~s/db/schema'
import { omit } from '~/shared/utils/object'

export const SearchProcedure = procedure
  .input(
    v.parser(
      v.object({
        query: v.string(),
        offset: v.number(),
      }),
    ),
  )
  .mutation(async ({ ctx, input }) => {
    const q = input.query

    const limit = 4

    const animeList = await ctx.db.query.anime.findMany({
      columns: {
        id: true,
        title: true,
        englishTitle: true,
        airedTo: true,
        airedFrom: true,
        type: true,
        rating: true,
        duration: true,
        totalEpisodes: true,
        imageUrl: true,
      },
      limit,
      offset: input.offset,
      where(anime, { and, eq, or, like, inArray }) {
        const qLike = `%${q}%`

        const mainQuery = and(
          eq(anime.isVisible, true),
          or(
            like(anime.title, qLike),
            like(anime.englishTitle, qLike),
            like(anime.japaneseTitle, qLike),
            like(anime.synopsis, qLike),
            inArray(
              anime.id,
              ctx.db
                .selectDistinct({ id: animeSynonyms.animeId })
                .from(animeSynonyms)
                .where(like(animeSynonyms.synonym, qLike))
                .limit(limit),
            ),
            inArray(
              anime.id,
              ctx.db
                .selectDistinct({ id: animeToGenres.animeId })
                .from(animeToGenres)
                .where(
                  inArray(
                    animeToGenres.genreId,
                    ctx.db
                      .selectDistinct({ id: genres.id })
                      .from(genres)
                      .where(like(genres.name, qLike))
                      .limit(limit),
                  ),
                ),
            ),
          ),
        )

        const asNumber = Number(q)
        if (isNaN(asNumber)) {
          return mainQuery
        }

        return or(eq(anime.id, asNumber), mainQuery)
      },
    })

    for (const animeData of animeList) {
      ctx.loadAnimePoster(animeData)
    }

    return animeList.map(anime => omit(anime, 'imageUrl'))
  })
