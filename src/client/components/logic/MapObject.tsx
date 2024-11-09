import type { ReactNode } from 'react'

/**
 * Known bug: Required<T> ngehilangin undefined walau sudah didefine secara explicit,
 *            mengakibatkan parameter item di cb bisa salah type
 */
export function MapObject<TObj extends Record<string, unknown>>({
  data,
  cb,
  onEmpty,
}: {
  data: TObj
  cb: (item: Required<TObj>[keyof TObj], key: keyof TObj, object: NoInfer<TObj>) => ReactNode
  onEmpty?: () => ReactNode
}): ReactNode {
  const result: ReactNode[] = []
  for (const key in data) {
    result.push(cb(data[key], key, data))
  }

  return result.length ? result : onEmpty?.()
}
