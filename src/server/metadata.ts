import { eq, sql } from 'drizzle-orm'
import SuperJSON, { type SuperJSONResult } from 'superjson'
import { metadata as metadataTable } from '~s/db/schema'
import { db } from './db'
import { buildConflictUpdateColumns } from './utils/db'

const defaultMetadata = () => ({
  lastStudioPage: 1,
  kuramanimeHost: 'kuramalink.me',
  kuramanimeCrawl: { perPage: 1, lastPage: 1 },
  kuramanimeOngoingLastFetchAt: null as null | Date,
  kuramanimeOngoingLastResetAt: null as null | Date,
  kuramanimeLeviathan: [null, null] as [id: null, token: null] | [id: string, token: string],
  kuramanimeCookie: [] as [key: string, [value: string, expires: number]][],
})

type Metadata = ReturnType<typeof defaultMetadata>

const queryMetadata = db
  .select({
    json: metadataTable.json,
    meta: metadataTable.meta,
  })
  .from(metadataTable)
  .where(eq(metadataTable.key, sql.placeholder('key')))
  .prepare()

export const metadata = {
  get<TKey extends keyof Metadata>(key: TKey): Metadata[TKey] {
    const result = queryMetadata.execute({ key }).sync()[0]

    if (result) {
      return SuperJSON.deserialize(result as SuperJSONResult) as Metadata[TKey]
    }

    return defaultMetadata()[key]
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
