import { rpc } from '~c/trpc'
import type { RouteRouter } from '~s/trpc-procedures/route'

type Paths = keyof (typeof rpc)['route']

export const fetchRouteData = <
  TPath extends Paths,
  TRoute extends (typeof RouteRouter)[TPath]['_def']['$types'],
>(
  ...[path, input]: TRoute['input'] extends never
    ? [path: TPath]
    : [path: TPath, input: TRoute['input']]
): Promise<TRoute['output']> => {
  // @ts-ignore
  return rpc.route[path].query(input)
}
