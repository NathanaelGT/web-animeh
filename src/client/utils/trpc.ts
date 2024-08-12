import type { ReactNode } from 'react'
import type { UseTRPCQueryResult } from '@trpc/react-query/shared'

export const mapTrpcArray = <TArray extends unknown[], TError extends unknown>({
  query,
  cb,
  onEmpty,
  onLoading,
  onError,
  filterCb = false,
}: {
  query: UseTRPCQueryResult<TArray, TError>
  cb: (item: NoInfer<TArray[number]>, index: number, array: NoInfer<TArray>) => ReactNode
  onEmpty?: () => ReactNode
  onLoading?: () => ReactNode
  onError?: (error: NoInfer<TError>) => ReactNode
  filterCb?: boolean
}): ReactNode => {
  if (query.isLoading) {
    return onLoading?.()
  } else if (query.error) {
    return onError?.(query.error)
  }

  const data = query.data!
  const count = data.length
  if (count) {
    const result = data.map(cb as (item: unknown) => ReactNode)

    if (filterCb) {
      for (let i = 0; i < count; i++) {
        if (result[i] !== null && result[i] !== undefined) {
          return result
        }
      }
    } else {
      return result
    }
  }

  return onEmpty?.()
}
