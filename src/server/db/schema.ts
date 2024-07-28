import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'
import type { settingsSchema } from '~s/profile/settings'

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  settings: text('settings', { mode: 'json' }).default('{}'),
})

export interface Profile extends Omit<typeof profiles.$inferSelect, 'settings'> {
  settings: z.infer<typeof settingsSchema>
}
