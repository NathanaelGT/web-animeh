import { customType, text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'
import type { settingsSchema } from '~/shared/profile/settings'

const aired = customType<{ data: Date }>({
  dataType() {
    return 'integer'
  },

  fromDriver(value): Date {
    return new Date((value as number) * 100_000)
  },

  toDriver(value): number {
    return value.getTime() / 100_000
  },
})

const score = customType<{ data: number }>({
  dataType() {
    return 'integer'
  },

  fromDriver(value): number {
    return (value as number) / 100
  },

  toDriver(value): number {
    return Math.round(value * 100)
  },
})

type Settings = z.infer<typeof settingsSchema>
type AnimeType = 'Movie' | 'TV' | 'ONA' | 'Special' | 'TV Special' | 'OVA' | (string & {})

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  settings: text('settings', { mode: 'json' }).$type<Settings>().notNull(),
})

export const anime = sqliteTable('anime', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  malId: integer('mal_id'),
  anilistId: integer('anilist_id'),
  title: text('title').notNull(),
  synopsis: text('synopsis'),
  totalEpisodes: integer('total_episodes'),
  airedFrom: aired('aired_from'),
  airedTo: aired('aired_to'),
  score: score('score'),
  rating: text('rating'),
  duration: integer('duration'),
  type: text('type').$type<AnimeType>().notNull(),
  imageUrl: text('image_url'),
})

export const animeMetadata = sqliteTable('anime_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  animeId: integer('anime_id')
    .notNull()
    .references(() => anime.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: integer('provider_id').notNull(),
})

export interface Profile extends Omit<typeof profiles.$inferSelect, 'settings'> {
  settings: Settings
}

export type Anime = typeof anime.$inferSelect
