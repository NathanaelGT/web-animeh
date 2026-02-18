import { Database } from 'bun:sqlite'
import fs from 'fs'
import path from 'path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { logger } from '~s/utils/logger'
import { basePath } from '~s/utils/path'
import * as schema from './schema'
import type { DrizzleConfig } from 'drizzle-orm'

const createDatabase = () => {
  const sqlite = new Database(basePath + 'db.sqlite', {
    strict: true,
    create: true,
  })

  process.on('exit', () => {
    sqlite.close()
  })

  sqlite.run('PRAGMA synchronous=normal')
  sqlite.run('PRAGMA journal_mode=WAL')

  return sqlite
}

const globalForDb = globalThis as unknown as {
  sqlite?: Database
}

const sqlite = Bun.env.PROD ? createDatabase() : (globalForDb.sqlite ??= createDatabase())

let isOptimized = false
export const optimizeDatabase = () => {
  if (isOptimized) {
    return
  }

  isOptimized = true

  sqlite.run('PRAGMA journal_mode=DELETE')
  sqlite.run('PRAGMA optimize')
}

const config: DrizzleConfig<typeof schema> = {
  schema,
}

if (!Bun.env.PROD) {
  config.logger = {
    logQuery(query, params) {
      // @ts-ignore internal query logging
      logger.__internal__query(query, { params })
    },
  }
}

export const db = drizzle(sqlite, config)

if (Bun.env.PROD) {
  const migrationsFolder = path.join(import.meta.dir, 'db')

  if (fs.existsSync(migrationsFolder)) {
    migrate(db, {
      migrationsFolder,
    })

    fs.promises.rmdir(migrationsFolder, { recursive: true })
  }
}
