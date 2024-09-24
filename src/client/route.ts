import { transformResult } from '@trpc/server/unstable-core-do-not-import'
import { TRPCClientError } from '@trpc/client'
import SuperJSON from 'superjson'
import { api, wsClient } from '~c/trpc'
import type { RouteRouter } from '~s/trpc-procedures/route'

type Paths = keyof (typeof api)['route']

let loaderRequestId = 0

export const fetchRouteData = <
  TPath extends Paths,
  TRoute extends (typeof RouteRouter)[TPath]['_def']['$types'],
>(
  ...[path, input]: TRoute['input'] extends never
    ? [path: TPath]
    : [path: TPath, input: TRoute['input']]
) => {
  return new Promise<TRoute['output']>((resolve, reject) => {
    wsClient.request({
      lastEventId: undefined,
      op: {
        type: 'query',
        path: `route.${path}`,
        id: --loaderRequestId,
        input: input ? SuperJSON.serialize(input) : '',
        context: {},
        signal: null,
      },
      callbacks: {
        complete() {},
        error() {},
        next(message) {
          const transformed = transformResult(message, SuperJSON)

          if (transformed.ok) {
            resolve(transformed.result.data as TRoute['output'])
          } else {
            reject(TRPCClientError.from(transformed.error))
          }
        },
      },
    })
  })
}
