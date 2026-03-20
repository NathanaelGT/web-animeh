import type { ReactNode } from 'react'

export function MapArray<TArray extends unknown[], TFilter extends boolean>({
  data,
  cb,
  onEmpty,
  filterCb = false as TFilter,
}: {
  data: TArray
  cb: (item: NoInfer<TArray[number]>, index: number, array: NoInfer<TArray>) => ReactNode
  onEmpty?: (isReallyEmpty: TFilter extends true ? boolean : null) => ReactNode
  filterCb?: TFilter
}): ReactNode {
  const count = data.length
  if (!count) {
    return onEmpty?.((filterCb ? true : null) as Parameters<typeof onEmpty>[0])
  }

  const result = data.map(cb as (item: unknown) => ReactNode)

  if (filterCb) {
    for (let i = 0; i < count; i++) {
      if (result[i] !== null && result[i] !== undefined) {
        return result
      }
    }

    return onEmpty?.(false as Parameters<typeof onEmpty>[0])
  }

  return result
}
