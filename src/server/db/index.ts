import { Database } from 'bun:sqlite'
import path from 'path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { isProduction } from '~s/env' with { type: 'macro' }
import { basePath } from '~s/utils/path'
import * as schema from './schema'
import { logger } from '~s/utils/logger'
import type { DrizzleConfig } from 'drizzle-orm'

const createDatabase = () => {
  return new Database(basePath + 'db.sqlite', {
    strict: true,
    create: true,
  })
}

const globalForDb = globalThis as unknown as {
  sqlite?: Database
}

const sqlite = isProduction() ? createDatabase() : (globalForDb.sqlite ??= createDatabase())

const config: DrizzleConfig<typeof schema> = {
  schema,
}

if (!isProduction()) {
  config.logger = {
    logQuery(query, params) {
      // @ts-ignore internal query logging
      logger.__internal__query(query, { params })
    },
  }
}

export const db = drizzle(sqlite, config)

migrate(db, {
  migrationsFolder: isProduction() ? path.join(import.meta.dir, 'drizzle') : basePath + 'drizzle',
})

process.on('exit', () => {
  sqlite.close()
})
