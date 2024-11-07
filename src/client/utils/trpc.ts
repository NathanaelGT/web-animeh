/*
  type yang ada disini dicopy dari TRPC,
  yang di TRPC gabisa diimport karena banyak type yang dimark sebagai internal
*/

import type {
  AnyProcedure,
  AnyRootTypes,
  inferProcedureInput,
  inferTransformedProcedureOutput,
  ProcedureType,
  RouterRecord,
} from '@trpc/server/unstable-core-do-not-import'

type ResolverDef = {
  input: any
  output: any
}

/**
 * @remark `void` is here due to https://github.com/trpc/trpc/pull/4374
 */
type CursorInput = {
  cursor?: any
} | void

export type MaybeDecoratedInfiniteQuery<TDef extends ResolverDef> =
  TDef['input'] extends CursorInput
    ? {
        useInfiniteQuery: unknown
        useSuspenseInfiniteQuery: unknown
        usePrefetchInfiniteQuery: unknown
      }
    : object

export type DecoratedQueryMethods<TDef extends ResolverDef> = {
  useQuery: unknown
  usePrefetchQuery: unknown
  useSuspenseQuery: unknown
}

export type DecoratedQuery<TDef extends ResolverDef> = MaybeDecoratedInfiniteQuery<TDef> &
  DecoratedQueryMethods<TDef>

export type DecoratedMutation<TDef extends ResolverDef> = {
  useMutation: unknown
}

export type DecoratedSubscription<TDef extends ResolverDef> = {
  useSubscription: unknown
}

type DecorateProcedure<
  TType extends ProcedureType,
  TDef extends ResolverDef,
> = TType extends 'query'
  ? DecoratedQuery<TDef>
  : TType extends 'mutation'
    ? DecoratedMutation<TDef>
    : TType extends 'subscription'
      ? DecoratedSubscription<TDef>
      : never

export type DecorateRouterRecord<TRoot extends AnyRootTypes, TRecord extends RouterRecord> = {
  [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value
    ? $Value extends RouterRecord
      ? DecorateRouterRecord<TRoot, $Value>
      : $Value extends AnyProcedure
        ? DecorateProcedure<
            $Value['_def']['type'],
            {
              input: inferProcedureInput<$Value>
              output: inferTransformedProcedureOutput<TRoot, $Value>
            }
          >
        : never
    : never
}

export type CreateTRPCReactBase = {
  useContext(): unknown
  useUtils(): unknown
  Provider: unknown
  createClient: unknown
  useQueries: unknown
  useSuspenseQueries: unknown
}
