import { eq } from 'drizzle-orm'
import { db } from '~s/db'
import * as episodeRepository from '~s/db/repository/episode'
import { anime, episodes, providerEpisodes } from '~s/db/schema'
import { jikanClient, jikanQueue } from '~s/external/api/jikan'
import * as kyInstances from '~s/ky'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { fetchText } from '~s/utils/fetch'
import { isMoreThanOneDay, isMoreThanOneMinute } from '~s/utils/time'
import { episodeMitt } from './event'

type Config = { priority?: number }

export const updateEpisode = async (
  animeData: Parameters<typeof episodeRepository.findByAnime>[0] &
    Partial<Pick<typeof anime.$inferSelect, 'episodeUpdatedAt'>>,
  config: Config = {},
  callback?: (episodeList: episodeRepository.EpisodeList) => void,
) => {
  if (!isMoreThanOneMinute(animeData.episodeUpdatedAt)) {
    if (callback) {
      episodeRepository.findByAnime(animeData).then(callback)
    }

    return
  }

  const promises: Promise<unknown>[] = []

  // jikan ngecache data selama 24 jam
  if (isMoreThanOneDay(animeData.episodeUpdatedAt)) {
    const fetchJikan = async (page: number) => {
      const result = await jikanQueue.add(
        () => jikanClient.anime.getAnimeEpisodes(animeData.id, page),
        { throwOnTimeout: true, priority: config.priority ?? (page === 1 ? 2 : 1) },
      )

      if (result.pagination?.has_next_page) {
        fetchJikan(page + 1)
      }

      const episodeList = result.data.map(episode => {
        return {
          animeId: animeData.id,
          number: episode.mal_id,
          title: episode.title,
          japaneseTitle: episode.title_japanese,
          romanjiTitle: episode.title_romanji,
          score: (episode as any).score, // @JIKAN_TYPE
          isFiller: episode.filler,
          isRecap: episode.recap,
        } satisfies typeof episodes.$inferInsert
      })

      const promises: Promise<void>[] = []

      if (episodeList.length) {
        promises.push(
          db
            .insert(episodes)
            .values(episodeList)
            .onConflictDoUpdate({
              target: [episodes.animeId, episodes.number],
              set: buildConflictUpdateColumns(episodes, [
                'title',
                'japaneseTitle',
                'romanjiTitle',
                'score',
                'isFiller',
                'isRecap',
              ]),
            })
            .execute(),
        )
      }

      if (page === 1) {
        promises.push(
          db
            .update(anime)
            .set({ episodeUpdatedAt: new Date(result.header.get('Last-Modified')) })
            .where(eq(anime.id, animeData.id))
            .execute(),
        )
      }

      await Promise.all(promises)
    }

    promises.push(fetchJikan(1))
  }

  const metadata = await db.query.animeMetadata.findFirst({
    where: (metadata, { eq }) => eq(metadata.animeId, animeData.id),
    columns: {
      provider: true,
      providerId: true,
      providerSlug: true,
    },
  })

  if (metadata) {
    const fetchKuramanime = async () => {
      const episodeNumbers: (typeof providerEpisodes.$inferInsert)[] = []
      const addEpisodeData = (number: number) => {
        episodeNumbers.push({
          animeId: animeData.id,
          provider: metadata.provider,
          providerId: metadata.providerId,
          number,
        })
      }

      const html = await fetchText(
        `anime/${metadata.providerId}/${metadata.providerSlug}`,
        {},
        kyInstances.kuramanime,
      )

      const episodeListHtml = html
        .slice(html.lastIndexOf(' id="episodeLists"'))
        .slice(0, html.indexOf(' id="episodeListsLoading"'))

      if (episodeListHtml.includes('Pilihan Cepat')) {
        const oldest = episodeListHtml.match(/Ep [0-9]+ \(Terlama\)/)
        const latest = episodeListHtml.match(/Ep [0-9]+ \(Terbaru\)/)

        if (oldest?.length && latest?.length) {
          const start = Number(oldest[0].slice(3))
          const end = Number(latest[0].slice(3))

          for (let i = start; i <= end; i++) {
            addEpisodeData(i)
          }
        }
      }

      if (!episodeNumbers.length) {
        episodeListHtml.match(/Ep [0-9]+/g)?.forEach(episode => {
          addEpisodeData(Number(episode.slice(3)))
        })
      }

      if (episodeNumbers.length) {
        await db.insert(providerEpisodes).values(episodeNumbers).onConflictDoNothing()
      }
    }

    promises.push(fetchKuramanime())
  }

  await Promise.all(promises)

  const key = animeData.id.toString()
  if (episodeMitt.all.get(key)?.length) {
    episodeRepository.findByAnime(animeData).then(episodeList => {
      callback?.(episodeList)

      episodeMitt.emit(key, episodeList)
    })
  } else if (callback) {
    episodeRepository.findByAnime(animeData).then(callback)
  }
}
