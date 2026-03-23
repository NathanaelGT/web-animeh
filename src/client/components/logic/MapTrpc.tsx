import { MapArray } from './MapArray'
import type { UseTRPCQueryResult } from '@trpc/react-query/shared'
import type { ReactNode } from 'react'

export function MapTrpc<TArray extends unknown[], TError extends unknown, TFilter extends boolean>({
  query,
  cb,
  onEmpty,
  onLoading,
  onError,
  filterCb = false as TFilter,
}: {
  query: UseTRPCQueryResult<TArray, TError>
  cb: (item: NoInfer<TArray[number]>, index: number, array: NoInfer<TArray>) => ReactNode
  onEmpty?: (isReallyEmpty: TFilter extends true ? boolean : null) => ReactNode
  onLoading?: () => ReactNode
  onError?: (error: NoInfer<TError>) => ReactNode
  filterCb?: TFilter
}): ReactNode {
  if (query.isLoading) {
    return onLoading?.()
  } else if (query.error) {
    return onError?.(query.error)
  }

  return MapArray({
    data: query.data!,
    cb: cb as (item: unknown) => ReactNode,
    onEmpty,
    filterCb,
  })
}
