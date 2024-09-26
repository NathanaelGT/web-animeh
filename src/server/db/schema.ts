import { customType, text, integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import type * as v from 'valibot'
import type { SuperJSONResult } from 'superjson'
import type { settingsSchema } from '~/shared/profile/settings'

const dateDiv100 = customType<{ data: Date }>({
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

type Settings = v.InferInput<typeof settingsSchema>
export type AnimeType = 'Movie' | 'TV' | 'ONA' | 'Special' | 'TV Special' | 'OVA' | (string & {})

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  settings: text('settings', { mode: 'json' }).$type<Settings>().notNull(),
})

export const anime = sqliteTable('anime', {
  id: integer('id').primaryKey(),
  anilistId: integer('anilist_id'),
  title: text('title').notNull(),
  japaneseTitle: text('japanese_title'),
  englishTitle: text('english_title'),
  synopsis: text('synopsis'),
  totalEpisodes: integer('total_episodes'),
  airedFrom: dateDiv100('aired_from'),
  airedTo: dateDiv100('aired_to'),
  score: score('score'),
  scoredBy: integer('scored_by'),
  rating: text('rating'),
  duration: integer('duration'),
  rank: integer('rank'),
  popularity: integer('popularity'),
  members: integer('members'),
  type: text('type').$type<AnimeType>(),
  imageUrl: text('image_url'),
  imageExtension: text('image_extension'),
  isVisible: integer('is_visible', { mode: 'boolean' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  episodeUpdatedAt: integer('episode_updated_at', { mode: 'timestamp' }),
  characterUpdatedAt: integer('character_updated_at', { mode: 'timestamp' }),
})

export const animeSynonyms = sqliteTable(
  'anime_synonyms',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    synonym: text('synonym').notNull(),
    type: text('type').notNull(),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.synonym, t.type] }),
  }),
)

export const animeMetadata = sqliteTable('anime_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  animeId: integer('anime_id')
    .notNull()
    .references(() => anime.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: integer('provider_id').notNull(),
  providerSlug: text('provider_slug'),
  providerData: text('provider_data'),
})

export const animeRelationships = sqliteTable(
  'anime_relationships',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    relatedId: integer('related_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.relatedId] }),
  }),
)

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
  establishedAt: dateDiv100('established_at'),
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
    type: text('type', { enum: ['studio', 'producer', 'licensor'] }).notNull(),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.studioId, t.type] }),
  }),
)

export const episodes = sqliteTable(
  'episodes',
  {
    animeId: integer('anime_id').notNull(),
    number: integer('number').notNull(),
    title: text('title'),
    japaneseTitle: text('japanese_title'),
    romanjiTitle: text('romanji_title'),
    score: score('score'),
    is_filler: integer('is_filler', { mode: 'boolean' }),
    is_recap: integer('is_recap', { mode: 'boolean' }),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.number] }),
  }),
)

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  favorites: integer('favorites'),
  imageUrl: text('image_url'),
  imageExtension: text('image_extension'),
})

export const persons = sqliteTable('persons', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
})

export const animeToCharacters = sqliteTable(
  'anime_to_characters',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    isMain: integer('is_main', { mode: 'boolean' }),
  },
  t => ({
    pk: primaryKey({ columns: [t.animeId, t.characterId] }),
  }),
)

export const characterToPersons = sqliteTable(
  'character_to_persons',
  {
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
  },
  t => ({
    pk: primaryKey({ columns: [t.characterId, t.personId] }),
  }),
)

export const metadata = sqliteTable('metadata', {
  key: text('key').primaryKey(),
  json: text('json', { mode: 'json' }).$type<SuperJSONResult['json']>().notNull(),
  meta: text('meta', { mode: 'json' }).$type<NonNullable<SuperJSONResult['meta']>>(),
})

export const animeRelations = relations(anime, ({ many }) => ({
  synonyms: many(animeSynonyms),
  metadata: many(animeMetadata),
  episodes: many(episodes),
  animeToGenres: many(animeToGenres),
  animeToStudios: many(animeToStudios),
  characters: many(animeToCharacters),
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

export const episodesRelations = relations(episodes, ({ one }) => ({
  anime: one(anime, { fields: [episodes.animeId], references: [anime.id] }),
}))

export const charactersRelations = relations(characters, ({ many }) => ({
  anime: many(animeToCharacters),
  persons: many(characterToPersons),
}))

export const personsRelations = relations(persons, ({ many }) => ({
  characters: many(characterToPersons),
}))

export const animeToCharactersRelations = relations(animeToCharacters, ({ one }) => ({
  anime: one(anime, { fields: [animeToCharacters.animeId], references: [anime.id] }),
  character: one(characters, {
    fields: [animeToCharacters.characterId],
    references: [characters.id],
  }),
}))

export const characterToPersonsRelations = relations(characterToPersons, ({ one }) => ({
  character: one(characters, {
    fields: [characterToPersons.characterId],
    references: [characters.id],
  }),
  person: one(persons, { fields: [characterToPersons.personId], references: [persons.id] }),
}))

export interface Profile extends Omit<typeof profiles.$inferSelect, 'settings'> {
  settings: Settings
}
