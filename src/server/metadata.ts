import * as v from 'valibot'
import SuperJSON from 'superjson'
import { metadata as metadataTable } from '~s/db/schema'
import { db } from './db'
import { buildConflictUpdateColumns } from './utils/db'

const metadataSchema = {
  lastStudioPage: number(1),
}

type Metadata = typeof metadataSchema

export const metadata = {
  async get<TKey extends keyof Metadata>(key: TKey): Promise<v.InferOutput<Metadata[TKey]>> {
    const result = await db.query.metadata.findFirst({
      where: (metadata, { eq }) => eq(metadata.key, key),
      columns: {
        value: true,
      },
    })

    const value = result ? SuperJSON.parse(result.value) : undefined

    return v.parse(metadataSchema[key], value)
  },

  async set<TKey extends keyof Metadata>(key: TKey, value: v.InferInput<Metadata[TKey]>) {
    await db
      .insert(metadataTable)
      .values({
        key,
        value: SuperJSON.stringify(value),
      })
      .onConflictDoUpdate({
        target: metadataTable.key,
        set: buildConflictUpdateColumns(metadataTable, ['value']),
      })
  },
}

function number(
  fallback: number,
  min?: number,
  max?: number,
): ReturnType<typeof v.fallback<ReturnType<typeof v.number>, number>> {
  const pipe = []

  if (min !== undefined) {
    pipe.push(v.minValue(min))
  }
  if (max !== undefined) {
    pipe.push(v.maxValue(max))
  }

  // @ts-ignore
  return v.fallback(v.pipe(v.number(), ...pipe), fallback)
}
