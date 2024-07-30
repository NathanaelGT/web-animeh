import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'
import type { settingsSchema } from '~/shared/profile/settings'

type Settings = z.infer<typeof settingsSchema>

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  settings: text('settings', { mode: 'json' }).$type<Settings>().notNull(),
})

export interface Profile extends Omit<typeof profiles.$inferSelect, 'settings'> {
  settings: Settings
}
