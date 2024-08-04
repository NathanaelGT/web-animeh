import axios from 'axios'
import { z } from 'zod'
import { env } from '~/env'
import { logger } from '~s/utils/logger'
import { limitRequest } from '~s/external/limit'

const postSchema = z.object({
  id: z.number(),
  admin_id: z.number(),
  anime_id: z.number(),
  title: z.string(),
  episode: z.number(),
  credit: z.string(),
  latest_comment_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  type: z.string(),
  episode_batch: z.string().nullable(),
  version_name: z.string().nullable(),
  episode_decimal: z.string().nullable(),
  is_published: z.number(),
  release_type: z.string().nullable(),
  latest_comment_id: z.number().nullable(),
  latest_comment_reply_id: z.number().nullable(),
  notes: z.string().nullable(),
  views: z.number(),
  last_added_views: z.number(),
})

const animeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  synopsis: z.string().nullable(),
  synopsis_short: z.string().nullable(),
  total_episodes: z.number().nullable(),
  aired_from: z.string(),
  aired_to: z.string().nullable(),
  scheduled_day: z.string().nullable(),
  scheduled_time: z.string().nullable(),
  score: z.number().nullable(),
  votes: z.number().nullable(),
  rating: z.string().nullable(),
  duration: z.string().nullable(),
  quality: z.string(),
  type: z.string(),
  status: z.string(),
  image_portrait_url: z.string().url(),
  image_landscape_url: z.string().url(),
  mal_url: z.string().url().nullable(),
  latest_post_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  abbreviation: z.string(),
  folder_name: z.string(),
  source: z.string(),
  season_id: z.number(),
  anilist_url: z.string().url().nullable(),
  data_source: z.string(),
  popularity: z.number().nullable(),
  members: z.number().nullable(),
  full_alt_titles: z.string(),
  latest_comment_at: z.string().nullable(),
  base_rank: z.number(),
  is_movie: z.number().nullable(),
  country_code: z.string(),
  latest_comment_id: z.number().nullable(),
  latest_comment_reply_id: z.number().nullable(),
  duplicate_id: z.number().nullable(),
  scheduled_date: z.string().nullable(),
  on_hold: z.number(),
  posts: z.array(postSchema),
})

const listResultSchema = z.object({
  animes: z.object({
    current_page: z.number(),
    data: z.array(animeSchema),
    first_page_url: z.string().url(),
    from: z.number(),
    last_page: z.number(),
    last_page_url: z.string().url(),
    links: z.array(
      z.object({
        url: z.string().url().nullable(),
        label: z.string(),
        active: z.boolean(),
      }),
    ),
    next_page_url: z.string().url().nullable(),
    path: z.string().url(),
    per_page: z.number(),
    prev_page_url: z.string().url().nullable(),
    to: z.number(),
    total: z.number(),
  }),
})

type Anime = z.infer<typeof animeSchema>

export const fetchAll = (callback: (animeList: Anime[]) => void) => {
  let page = 0
  let maxPage = Infinity

  const fetchPage = (page: number) => {
    return limitRequest(async () => {
      const { data } = await axios.get(
        `https://kuramanime.${env.KURAMANIME_TLD}/properties/country/jp?` +
          `order_by=latest&name=JP&page=${page}&need_json=true`,
      )

      const parsedData = listResultSchema.parse(data)
      maxPage = parsedData.animes.last_page

      callback(parsedData.animes.data)
    })
  }

  try {
    const promises: Promise<void>[] = []

    while (++page < 30) {
      promises.push(fetchPage(page))
    }

    // biar maxPagenya keset
    Promise.any(promises).then(() => {
      promises.length = 0

      while (++page < maxPage) {
        promises.push(fetchPage(page))
      }
    })
  } catch (error) {
    logger.error('Failed to scrape all kuramanime data', { currentPage: page, maxPage, error })
  }
}
