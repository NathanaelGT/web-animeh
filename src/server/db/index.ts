import { Database } from 'bun:sqlite'
import path from 'path'
import fs from 'fs'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'
import { basePath } from '~s/utils/path'
import { logger } from '~s/utils/logger'
import { isProduction } from '~s/env' with { type: 'macro' }
import type { DrizzleConfig } from 'drizzle-orm'

const createDatabase = () => {
  const sqlite = new Database(basePath + 'db.sqlite', {
    strict: true,
    create: true,
  })

  process.on('exit', () => {
    sqlite.close()
  })

  return sqlite
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

if (isProduction()) {
  const migrationsFolder = path.join(import.meta.dir, 'db')

  if (fs.existsSync(migrationsFolder)) {
    migrate(db, {
      migrationsFolder,
    })

    fs.promises.rmdir(migrationsFolder, { recursive: true })
  }
}
