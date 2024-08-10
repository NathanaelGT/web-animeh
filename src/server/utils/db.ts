import { getTableColumns, sql, type SQL } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

export const buildConflictUpdateColumns = <
  TTable extends SQLiteTable,
  TColumn extends keyof TTable['_']['columns'],
>(
  table: TTable,
  columns: TColumn[],
) => {
  const cls = getTableColumns(table)
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column]!.name
      acc[column] = sql.raw(`excluded.${colName}`)
      return acc
    },
    {} as Record<TColumn, SQL>,
  )
}
