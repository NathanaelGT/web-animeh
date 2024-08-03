import { customType, text, integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
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
  japaneseTitle: text('japanese_title'),
  englishTitle: text('english_title'),
  synopsis: text('synopsis'),
  totalEpisodes: integer('total_episodes'),
  airedFrom: aired('aired_from'),
  airedTo: aired('aired_to'),
  score: score('score'),
  rating: text('rating'),
  duration: integer('duration'),
  type: text('type').$type<AnimeType>().notNull(),
  imageUrl: text('image_url'),
  imageExtension: text('image_extension'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const animeSynonyms = sqliteTable('anime_synonyms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  animeId: integer('anime_id')
    .notNull()
    .references(() => anime.id, { onDelete: 'cascade' }),
  synonym: text('synonym').notNull(),
  type: text('type').notNull(),
})

export const animeMetadata = sqliteTable('anime_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  animeId: integer('anime_id')
    .notNull()
    .references(() => anime.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: integer('provider_id').notNull(),
})

export const genres = sqliteTable('genres', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const animeToGenres = sqliteTable(
  'anime_to_anime_genres',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genres.id),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.genreId] }),
  }),
)

export const studios = sqliteTable('studios', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  about: text('about'),
  imageUrl: text('image_url'),
  establishedAt: integer('established_at', { mode: 'timestamp' }),
})

export const studioSynonyms = sqliteTable('studio_synonyms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studioId: integer('studio_id')
    .notNull()
    .references(() => studios.id, { onDelete: 'cascade' }),
  synonym: text('synonym').notNull(),
  type: text('type').notNull(),
})

export const animeToStudios = sqliteTable(
  'anime_to_anime_studios',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    studioId: integer('studio_id').notNull(),
    type: text('type', { enum: ['studio', 'producer'] }).notNull(),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.studioId, t.type] }),
  }),
)

export const animeRelations = relations(anime, ({ one, many }) => ({
  synonyms: many(animeSynonyms),
  metadata: one(animeMetadata, { fields: [anime.id], references: [animeMetadata.animeId] }),
  animeToGenres: many(animeToGenres),
  animeToStudios: many(animeToStudios),
}))

export const animeSynonymsRelations = relations(animeSynonyms, ({ one }) => ({
  anime: one(anime, { fields: [animeSynonyms.animeId], references: [anime.id] }),
}))

export const animeMetadataRelations = relations(animeMetadata, ({ one }) => ({
  anime: one(anime, { fields: [animeMetadata.animeId], references: [anime.id] }),
}))

export const genresRelations = relations(genres, ({ many }) => ({
  animeToGenres: many(animeToGenres),
}))

export const studioSynonymsRelations = relations(studioSynonyms, ({ one }) => ({
  studio: one(studios, { fields: [studioSynonyms.studioId], references: [studios.id] }),
}))

export const studiosRelations = relations(studios, ({ many }) => ({
  synonyms: many(studioSynonyms),
  animeToStudios: many(animeToStudios),
}))

export const animeToGenresRelations = relations(animeToGenres, ({ one }) => ({
  anime: one(anime, { fields: [animeToGenres.animeId], references: [anime.id] }),
  genre: one(genres, { fields: [animeToGenres.genreId], references: [genres.id] }),
}))

export const animeToStudiosRelations = relations(animeToStudios, ({ one }) => ({
  anime: one(anime, { fields: [animeToStudios.animeId], references: [anime.id] }),
  studio: one(studios, { fields: [animeToStudios.studioId], references: [studios.id] }),
}))

export interface Profile extends Omit<typeof profiles.$inferSelect, 'settings'> {
  settings: Settings
}
