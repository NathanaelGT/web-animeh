import ky from 'ky'
import * as v from 'valibot'
import { env } from '~/env'
import { metadata } from '~s/metadata'
import { limitRequest } from '~s/external/limit'

const postSchema = v.object({
  // id: v.number(),
  // admin_id: v.number(),
  // anime_id: v.number(),
  // title: v.string(),
  // episode: v.number(),
  // credit: v.string(),
  // latest_comment_at: v.nullable(v.string()),
  // created_at: v.string(),
  // updated_at: v.string(),
  // deleted_at: v.nullable(v.string()),
  type: v.string(),
  // episode_batch: v.nullable(v.string()),
  // version_name: v.nullable(v.string()),
  episode_decimal: v.nullable(v.string()),
  // is_published: v.number(),
  // release_type: v.nullable(v.string()),
  // latest_comment_id: v.nullable(v.number()),
  // latest_comment_reply_id: v.nullable(v.number()),
  // notes: v.nullable(v.string()),
  // views: v.number(),
  // last_added_views: v.number(),
})

const animeSchema = v.object({
  id: v.number(),
  title: v.string(),
  slug: v.string(),
  // synopsis: v.nullable(v.string()),
  // synopsis_short: v.nullable(v.string()),
  total_episodes: v.nullable(v.number()),
  aired_from: v.string(),
  aired_to: v.nullable(v.string()),
  // scheduled_day: v.nullable(v.string()),
  // scheduled_time: v.nullable(v.string()),
  score: v.nullable(v.number()),
  // votes: v.nullable(v.number()),
  rating: v.nullable(v.string()),
  duration: v.nullable(v.string()),
  // quality: v.string(),
  type: v.string(),
  // status: v.string(),
  image_portrait_url: v.pipe(v.string(), v.url()),
  // image_landscape_url: v.pipe(v.string(), v.url()),
  mal_url: v.nullable(v.pipe(v.string(), v.url())),
  // latest_post_at: v.string(),
  // created_at: v.string(),
  // updated_at: v.string(),
  // deleted_at: v.nullable(v.string()),
  // abbreviation: v.string(),
  // folder_name: v.string(),
  // source: v.string(),
  // season_id: v.number(),
  anilist_url: v.nullable(v.pipe(v.string(), v.url())),
  // data_source: v.string(),
  // popularity: v.nullable(v.number()),
  // members: v.nullable(v.number()),
  // full_alt_titles: v.string(),
  // latest_comment_at: v.nullable(v.string()),
  // base_rank: v.nullable(v.number()),
  // is_movie: v.nullable(v.number()),
  // country_code: v.string(),
  // latest_comment_id: v.nullable(v.number()),
  // latest_comment_reply_id: v.nullable(v.number()),
  // duplicate_id: v.nullable(v.number()),
  // scheduled_date: v.nullable(v.string()),
  // on_hold: v.number(),
  posts: v.array(postSchema),
})

const listResultSchema = v.object({
  animes: v.object({
    // current_page: v.number(),
    data: v.array(animeSchema),
    // first_page_url: v.pipe(v.string(), v.url()),
    // from: v.number(),
    last_page: v.number(),
    // last_page_url: v.pipe(v.string(), v.url()),
    // links: v.array(
    //   v.object({
    //     url: v.nullable(v.pipe(v.string(), v.url())),
    //     label: v.string(),
    //     active: v.boolean(),
    //   }),
    // ),
    // next_page_url: v.nullable(v.pipe(v.string(), v.url())),
    // path: v.pipe(v.string(), v.url()),
    per_page: v.number(),
    // prev_page_url: v.nullable(v.pipe(v.string(), v.url())),
    // to: v.number(),
    // total: v.number(),
  }),
})

type OrderBy = 'latest' | 'oldest' | 'updated'

export const fetchPage = async (page: number, orderBy: OrderBy = 'oldest') => {
  const response = await limitRequest(() => {
    return ky.get(
      `https://kuramanime.${env.KURAMANIME_TLD}/properties/country/jp?` +
        `order_by=${orderBy}&name=JP&page=${page}&need_json=true`,
    )
  })

  return v.parse(listResultSchema, await response.json())
}

export type Anime = v.InferInput<typeof animeSchema>

export const fetchAll = async (callback: (animeList: Anime[]) => Promise<void> | void) => {
  let page = 0
  let lastPage = Infinity

  const promises: Promise<void>[] = []
  const cbPromises: Promise<void>[] = []

  const crawl = async (page: number) => {
    const parsedData = await fetchPage(page, 'latest')

    if (lastPage === Infinity) {
      lastPage = parsedData.animes.last_page

      metadata.set('kuramanimeCrawl', {
        perPage: parsedData.animes.per_page,
        lastPage,
      })
    }

    const cbResult = callback(parsedData.animes.data)
    if (cbResult instanceof Promise) {
      cbPromises.push(cbResult)
    }
  }

  while (++page < 30) {
    promises.push(crawl(page))
  }

  // biar maxPagenya keset
  Promise.any(promises).then(() => {
    promises.length = 0

    while (++page < lastPage) {
      promises.push(crawl(page))
    }
  })

  await Promise.all(promises)
  await Promise.all(cbPromises)
}
