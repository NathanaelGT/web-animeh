import type { ReactNode } from 'react'

export function MapObject<TObj extends Record<string, unknown>>({
  data,
  cb,
  onEmpty,
}: {
  data: TObj
  cb: (item: NoInfer<TObj[string]>, key: string, object: NoInfer<TObj>) => ReactNode
  onEmpty?: () => ReactNode
}): ReactNode {
  const result: ReactNode[] = []
  for (const key in data) {
    result.push(cb(data[key], key, data))
  }

  return result.length ? result : onEmpty?.()
}
