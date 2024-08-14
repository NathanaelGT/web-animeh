import { z } from 'zod'
import { procedure } from '~s/trpc'
import { animeSynonyms, animeToGenres, genres } from '~s/db/schema'

export const SearchProcedure = procedure
  .input(
    z.object({
      query: z.string(),
      offset: z.number(),
    }),
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
        imageExtension: true,
      },
      limit,
      offset: input.offset,
      where(anime, { or, like, inArray }) {
        return or(
          like(anime.title, `%${q}%`),
          like(anime.englishTitle, `%${q}%`),
          like(anime.japaneseTitle, `%${q}%`),
          like(anime.synopsis, `%${q}%`),
          inArray(
            anime.id,
            ctx.db
              .selectDistinct({ id: animeSynonyms.animeId })
              .from(animeSynonyms)
              .where(like(animeSynonyms.synonym, `%${q}%`))
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
                    .where(like(genres.name, `%${q}%`))
                    .limit(limit),
                ),
              ),
          ),
        )
      },
    })

    for (const animeData of animeList) {
      ctx.loadAnimePoster(animeData)
    }

    return animeList
  })
