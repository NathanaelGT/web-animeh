import { z } from 'zod'
import { procedure } from '~s/trpc'
import { animeSynonyms, animeToGenres, genres } from '~s/db/schema'

export const SearchProcedure = procedure.input(z.string()).mutation(async ({ input, ctx }) => {
  const limit = 4

  const results = await ctx.db.query.anime.findMany({
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
    where(anime, { or, like, inArray }) {
      return or(
        like(anime.title, `%${input}%`),
        like(anime.englishTitle, `%${input}%`),
        like(anime.japaneseTitle, `%${input}%`),
        like(anime.synopsis, `%${input}%`),
        inArray(
          anime.malId,
          ctx.db
            .selectDistinct({ id: animeSynonyms.animeId })
            .from(animeSynonyms)
            .where(like(animeSynonyms.synonym, `%${input}%`))
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
                  .where(like(genres.name, `%${input}%`))
                  .limit(limit),
              ),
            ),
        ),
      )
    },
  })

  const images = results.map(result => result.id + '.' + result.imageExtension)
  ctx.loadImage(images)

  return results
})
