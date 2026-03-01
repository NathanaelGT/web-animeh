import { eq, sql } from 'drizzle-orm'
import SuperJSON, { type SuperJSONResult } from 'superjson'
import { kv as kvTable } from '~s/db/schema'
import { db } from './db'
import { buildConflictUpdateColumns } from './utils/db'

const defaultKv = () => ({
  lastStudioPage: 1,
  kuramanimeHost: 'kuramalink.me',
  kuramanimeCrawl: [1, 1] as [perPage: number, lastPage: number],
  kuramanimeOngoing: [0, 0] as [lastFetchAt: number, lastResetAt: number],
  kuramanimeLeviathan: [null, null] as [id: null, token: null] | [id: string, token: string],
  kuramanimeCookie: [] as [key: string, [value: string, expires: number]][],
})

type KV = ReturnType<typeof defaultKv>

const queryKv = db
  .select({
    json: kvTable.json,
    meta: kvTable.meta,
  })
  .from(kvTable)
  .where(eq(kvTable.key, sql.placeholder('key')))
  .prepare()

export const kv = {
  get<TKey extends keyof KV>(key: TKey): KV[TKey] {
    const result = queryKv.execute({ key }).sync()[0]

    if (result) {
      return SuperJSON.deserialize(result as SuperJSONResult) as KV[TKey]
    }

    return defaultKv()[key]
  },

  async set<TKey extends keyof KV>(
    key: TKey,
    value: KV[TKey],
    connection: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
  ) {
    const serialized = SuperJSON.serialize(value) as typeof kvTable.$inferInsert

    serialized.key = key

    await connection
      .insert(kvTable)
      .values(serialized)
      .onConflictDoUpdate({
        target: kvTable.key,
        set: buildConflictUpdateColumns(kvTable, ['json', 'meta']),
      })
  },
}
