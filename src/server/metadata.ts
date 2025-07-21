import SuperJSON, { type SuperJSONResult } from 'superjson'
import { metadata as metadataTable } from '~s/db/schema'
import { db } from './db'
import { buildConflictUpdateColumns } from './utils/db'
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core'

const defaultMetadata = {
  lastStudioPage: 1,
  kuramanimeCrawl: { perPage: 1, lastPage: 1 },
  kuramanimeOngoingLastFetchAt: null as null | Date,
  kuramanimeOngoingLastResetAt: null as null | Date,
}

type Metadata = typeof defaultMetadata

export const metadata = {
  async get<TKey extends keyof Metadata>(key: TKey): Promise<Metadata[TKey]> {
    const result = await db.query.metadata.findFirst({
      where: (metadata, { eq }) => eq(metadata.key, key),
      columns: {
        json: true,
        meta: true,
      },
    })

    if (result) {
      return SuperJSON.deserialize(result as SuperJSONResult) as Metadata[TKey]
    }

    return defaultMetadata[key]
  },

  async set<TKey extends keyof Metadata>(
    key: TKey,
    value: Metadata[TKey],
    connection: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
  ) {
    const serialized = SuperJSON.serialize(value) as typeof metadataTable.$inferInsert

    serialized.key = key

    await connection
      .insert(metadataTable)
      .values(serialized)
      .onConflictDoUpdate({
        target: metadataTable.key,
        set: buildConflictUpdateColumns(metadataTable, ['json', 'meta']),
      })
  },
}
