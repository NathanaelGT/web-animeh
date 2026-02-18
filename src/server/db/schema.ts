import { relations } from 'drizzle-orm'
import {
  customType,
  text,
  integer,
  primaryKey,
  sqliteTable,
  foreignKey,
} from 'drizzle-orm/sqlite-core'
import type { SuperJSONResult } from 'superjson'
import type * as v from 'valibot'
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

const createRepetitivePrefixColumnType = (repetitivePrefix: string) => {
  return customType<{ data: string }>({
    dataType() {
      return 'text'
    },

    fromDriver(value): string {
      return (value as string).startsWith('http') ? (value as string) : repetitivePrefix + value
    },

    toDriver(value): string {
      return value.startsWith(repetitivePrefix) ? value.slice(repetitivePrefix.length) : value
    },
  })
}

const malAnimeImage = createRepetitivePrefixColumnType('https://cdn.myanimelist.net/images/anime/')
const malStudioImage = createRepetitivePrefixColumnType(
  'https://cdn.myanimelist.net/s/common/company_logos/',
)
const malCharacterImage = createRepetitivePrefixColumnType(
  'https://cdn.myanimelist.net/images/characters/',
)

const createRepetitiveStringsColumnType = <TStringList extends string[]>(
  ...stringList: TStringList
) => {
  return customType<{ data: [string & {}, ...TStringList][number] }>({
    dataType() {
      return 'text'
    },

    fromDriver(value): string {
      const index = Number(value as string)

      return isNaN(index) ? (value as string) : stringList[index]!
    },

    toDriver(value): string {
      const index = stringList.indexOf(value)

      return index > -1 ? index.toString() : value
    },
  })
}

const createEnumStringsColumnType = <TStringList extends string[]>(...stringList: TStringList) => {
  return customType<{ data: TStringList[number] }>({
    dataType() {
      return 'integer'
    },

    fromDriver(index): TStringList[number] {
      const value = stringList[index as number]
      if (value) {
        return value
      }

      throw new Error(`Invalid enum index: ${index}`)
    },

    toDriver(value): number {
      const index = stringList.indexOf(value)
      if (index > -1) {
        return index
      }

      throw new Error(`Invalid enum value: ${value}`)
    },
  })
}

const malAnimeRelationType = createRepetitiveStringsColumnType(
  'Other',
  'Sequel',
  'Prequel',
  'Side Story',
  'Parent Story',
  'Alternative Setting',
  'Summary',
  'Alternative Version',
  'Character',
  'Spin-Off',
  'Full Story',
)

const malStudioSynonymType = createRepetitiveStringsColumnType('Japanese', 'Synonym')

const providerType = createEnumStringsColumnType('kuramanime')

type Settings = v.InferInput<typeof settingsSchema>
export type AnimeType =
  | 'TV'
  | 'Movie'
  | 'ONA'
  | 'OVA'
  | 'Special'
  | 'TV Special'
  | 'PV'
  | (string & {})

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
  imageUrl: malAnimeImage('image_url'),
  isVisible: integer('is_visible', { mode: 'boolean' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
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
  t => [primaryKey({ columns: [t.animeId, t.synonym, t.type] })],
)

export const animeMetadata = sqliteTable(
  'anime_metadata',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    provider: providerType('provider').notNull(),
    providerId: integer('provider_id').notNull(),
    providerSlug: text('provider_slug'),
    providerData: text('provider_data'),
  },
  t => [primaryKey({ columns: [t.animeId, t.provider, t.providerId] })],
)

export const ongoingAnimeUpdates = sqliteTable(
  'ongoing_anime_updates',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    provider: providerType('provider').notNull(),
    lastEpisodeAiredAt: integer('last_episode_aired_at', { mode: 'timestamp' }),
  },
  t => [primaryKey({ columns: [t.animeId, t.provider] })],
)

export const animeRelationships = sqliteTable(
  'anime_relationships',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    relatedId: integer('related_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    type: malAnimeRelationType('type').notNull(),
  },
  t => [primaryKey({ columns: [t.animeId, t.relatedId] })],
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
  t => [primaryKey({ columns: [t.animeId, t.genreId] })],
)

export const studios = sqliteTable('studios', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  about: text('about'),
  imageUrl: malStudioImage('image_url'),
  establishedAt: dateDiv100('established_at'),
})

export const studioSynonyms = sqliteTable('studio_synonyms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studioId: integer('studio_id')
    .notNull()
    .references(() => studios.id, { onDelete: 'cascade' }),
  synonym: text('synonym').notNull(),
  type: malStudioSynonymType('type').notNull(),
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
  t => [primaryKey({ columns: [t.animeId, t.studioId, t.type] })],
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
    isFiller: integer('is_filler', { mode: 'boolean' }),
    isRecap: integer('is_recap', { mode: 'boolean' }),
  },
  t => [primaryKey({ columns: [t.animeId, t.number] })],
)

export const providerEpisodes = sqliteTable(
  'provider_episodes',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    provider: providerType('provider').notNull(),
    providerId: integer('provider_id').notNull(),
    number: integer('number').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }),
  },
  t => [
    primaryKey({ columns: [t.animeId, t.provider, t.providerId, t.number] }),

    foreignKey({
      columns: [t.animeId, t.number],
      foreignColumns: [episodes.animeId, episodes.number],
    }).onDelete('cascade'),

    foreignKey({
      columns: [t.animeId, t.provider, t.providerId],
      foreignColumns: [animeMetadata.animeId, animeMetadata.provider, animeMetadata.providerId],
    }).onDelete('cascade'),
  ],
)

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  favorites: integer('favorites'),
  imageUrl: malCharacterImage('image_url'),
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
  t => [primaryKey({ columns: [t.animeId, t.characterId] })],
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
  t => [primaryKey({ columns: [t.characterId, t.personId] })],
)

export const metadata = sqliteTable('metadata', {
  key: text('key').primaryKey(),
  json: text('json', { mode: 'json' }).$type<SuperJSONResult['json']>().notNull(),
  meta: text('meta', { mode: 'json' }).$type<NonNullable<SuperJSONResult['meta']>>(),
})

export const animeRelations = relations(anime, ({ one, many }) => ({
  synonyms: many(animeSynonyms),
  metadata: many(animeMetadata),
  episodes: many(episodes),
  ongoingUpdates: one(ongoingAnimeUpdates),
  providerEpisodes: many(providerEpisodes),
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

export const ongoingAnimeUpdatesRelations = relations(ongoingAnimeUpdates, ({ one }) => ({
  anime: one(anime, { fields: [ongoingAnimeUpdates.animeId], references: [anime.id] }),
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

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  anime: one(anime, { fields: [episodes.animeId], references: [anime.id] }),
  providers: many(providerEpisodes),
}))

export const providerEpisodesRelations = relations(providerEpisodes, ({ one }) => ({
  anime: one(anime, { fields: [providerEpisodes.animeId], references: [anime.id] }),
  episode: one(episodes, {
    fields: [providerEpisodes.animeId, providerEpisodes.number],
    references: [episodes.animeId, episodes.number],
  }),
  metadata: one(animeMetadata, {
    fields: [providerEpisodes.animeId, providerEpisodes.provider, providerEpisodes.providerId],
    references: [animeMetadata.animeId, animeMetadata.provider, animeMetadata.providerId],
  }),
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
