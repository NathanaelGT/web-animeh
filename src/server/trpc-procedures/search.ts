import { z } from 'zod'
import { procedure } from '~s/trpc'
import { omit } from '~/shared/utils/object'
import { animeSynonyms, animeToGenres, genres } from '~s/db/schema'

export const SearchProcedure = procedure.input(z.string()).mutation(async ({ input, ctx }) => {
  const limit = 4

  const animeList = await ctx.db.query.anime.findMany({
    columns: {
      id: true,
      malId: true,
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

  return animeList.map(animeData => {
    ctx.loadAnimePoster(animeData)

    return omit(animeData, 'malId')
  })
})
