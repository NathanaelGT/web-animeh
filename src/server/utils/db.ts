import { sql, type SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

export const buildConflictUpdateColumns = <
  TTable extends SQLiteTable,
  TColumn extends keyof TTable['_']['columns'],
>(
  table: TTable,
  columns: TColumn[],
) => {
  return columns.reduce(
    (acc, column) => {
      const colName = (table as unknown as TTable['_']['columns'])[column]!.name
      acc[column] = sql.raw(`excluded.${colName}`)
      return acc
    },
    {} as Record<TColumn, SQL>,
  )
}
