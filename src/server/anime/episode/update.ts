import { eq } from 'drizzle-orm'
import { db } from '~s/db'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { anime, episodes } from '~s/db/schema'
import { jikanClient, jikanQueue } from '~s/external/api/jikan'

export const updateEpisode = async (animeData: Pick<typeof anime.$inferSelect, 'malId'>) => {
  db.update(anime)
    .set({ episodeUpdatedAt: new Date() })
    .where(eq(anime.malId, animeData.malId))
    .execute()

  const walk = async (page: number) => {
    const result = await jikanQueue.add(
      () => jikanClient.anime.getAnimeEpisodes(animeData.malId, page),
      { throwOnTimeout: true, priority: page === 1 ? 2 : 1 },
    )

    if (result.pagination?.has_next_page) {
      void walk(page + 1)
    }

    if (!result.data.length) {
      return []
    }

    const episodeList = result.data.map(episode => {
      return {
        animeId: animeData.malId,
        number: episode.mal_id,
        title: episode.title,
        japaneseTitle: episode.title_japanese,
        romanjiTitle: episode.title_romanji,
        score: (episode as any).score,
        is_filler: episode.filler,
        is_recap: episode.recap,
      } satisfies typeof episodes.$inferInsert
    })

    db.insert(episodes)
      .values(episodeList)
      .onConflictDoUpdate({
        target: [episodes.animeId, episodes.number],
        set: buildConflictUpdateColumns(episodes, [
          'title',
          'japaneseTitle',
          'romanjiTitle',
          'score',
          'is_filler',
          'is_recap',
        ]),
      })
      .execute()

    return episodeList
  }

  return walk(1)
}
