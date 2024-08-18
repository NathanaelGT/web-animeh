import { eq } from 'drizzle-orm'
import { env } from '~/env'
import { db } from '~s/db'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { anime, episodes } from '~s/db/schema'
import { jikanClient, jikanQueue } from '~s/external/api/jikan'
import { fetchText } from '~/shared/utils/fetch'
import { isMoreThanOneDay, isMoreThanOneMinute } from '~/server/utils/time'
import { dedupeEpisodes } from './dedupe'

export const updateEpisode = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'episodeUpdatedAt'>,
) => {
  if (!isMoreThanOneMinute(animeData.episodeUpdatedAt)) {
    return []
  }

  let episodeListPromise: Promise<(typeof episodes.$inferSelect)[]>

  // jikan ngecache data selama 24 jam
  if (isMoreThanOneDay(animeData.episodeUpdatedAt)) {
    db.update(anime)
      .set({ episodeUpdatedAt: new Date() })
      .where(eq(anime.id, animeData.id))
      .execute()

    const walkJikan = async (page: number) => {
      const result = await jikanQueue.add(
        () => jikanClient.anime.getAnimeEpisodes(animeData.id, page),
        { throwOnTimeout: true, priority: page === 1 ? 2 : 1 },
      )

      if (result.pagination?.has_next_page) {
        void walkJikan(page + 1)
      }

      if (!result.data.length) {
        return []
      }

      const episodeList = result.data.map(episode => {
        return {
          animeId: animeData.id,
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

    episodeListPromise = walkJikan(1)
  } else {
    episodeListPromise = Promise.resolve([])
  }

  const metadata = await db.query.animeMetadata.findFirst({
    where: (metadata, { eq }) => eq(metadata.animeId, animeData.id),
    columns: {
      providerId: true,
      providerSlug: true,
    },
  })

  if (!metadata) {
    return episodeListPromise
  }

  const fromKuramanime = async () => {
    const createEpisodeData = (number: number) => {
      return {
        animeId: animeData.id,
        number,
        title: null,
        japaneseTitle: null,
        romanjiTitle: null,
        score: null,
        is_filler: null,
        is_recap: null,
      } satisfies typeof episodes.$inferInsert
    }
    const episodeNumbers: ReturnType<typeof createEpisodeData>[] = []

    const html = await fetchText(
      `https://kuramanime.${env.KURAMANIME_TLD}/anime/${metadata.providerId}/${metadata.providerSlug}`,
    )

    const episodeListHtml = html
      .slice(html.lastIndexOf(' id="episodeLists"'))
      .slice(0, html.indexOf(' id="episodeListsLoading"'))

    if (episodeListHtml.includes('Pilihan Cepat')) {
      const oldest = episodeListHtml.match(/Ep [0-9]+ \(Terlama\)/)
      const latest = episodeListHtml.match(/Ep [0-9]+ \(Terbaru\)/)

      if (oldest?.length && latest?.length) {
        const start = parseInt(oldest[0].slice(3))
        const end = parseInt(latest[0].slice(3))

        for (let i = start; i <= end; i++) {
          episodeNumbers.push(createEpisodeData(i))
        }
      }
    }

    if (!episodeNumbers.length) {
      const episodeList = episodeListHtml.match(/Ep [0-9]+/g)
      if (!episodeList?.length) {
        return []
      }

      for (const episode of episodeList) {
        episodeNumbers.push(createEpisodeData(parseInt(episode.slice(3))))
      }
    }

    if (episodeNumbers.length) {
      db.insert(episodes).values(episodeNumbers).onConflictDoNothing().execute()
    }

    return episodeNumbers
  }

  const [jikanResult, kuramanimeResult] = await Promise.all([episodeListPromise, fromKuramanime()])

  return dedupeEpisodes(jikanResult, kuramanimeResult)
}
