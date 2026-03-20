/*
  type yang ada disini dicopy dari TRPC,
  yang di TRPC gabisa diimport karena banyak type yang dimark sebagai internal
*/

import type {
  DefinedInitialDataInfiniteOptions,
  DefinedUseInfiniteQueryResult,
  InfiniteData,
  SkipToken,
  UndefinedInitialDataInfiniteOptions,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseSuspenseInfiniteQueryOptions,
  UseSuspenseInfiniteQueryResult,
  UseSuspenseQueryResult,
} from '@tanstack/react-query'
import type { TRPCClientErrorLike } from '@trpc/client'
import type {
  TRPCFetchInfiniteQueryOptions,
  TRPCFetchQueryOptions,
  DefinedUseTRPCQueryOptions,
  DefinedUseTRPCQueryResult,
  TRPCHookResult,
  TRPCUseQueryBaseOptions,
  UseTRPCMutationOptions,
  UseTRPCMutationResult,
  UseTRPCQueryOptions,
  UseTRPCQueryResult,
  UseTRPCSubscriptionOptions,
  UseTRPCSuspenseQueryOptions,
} from '@trpc/react-query/shared'
import type {
  AnyProcedure,
  AnyRootTypes,
  inferProcedureInput,
  inferTransformedProcedureOutput,
  ProcedureType,
  RouterRecord,
  Simplify,
} from '@trpc/server/unstable-core-do-not-import'

type ResolverDef = {
  input: any
  output: any
  transformer: boolean
  errorShape: any
}

interface ProcedureUseQuery<TDef extends ResolverDef> {
  <TQueryFnData extends TDef['output'] = TDef['output'], TData = TQueryFnData>(
    input: TDef['input'] | SkipToken,
    opts: DefinedUseTRPCQueryOptions<
      TQueryFnData,
      TData,
      TRPCClientErrorLike<{
        errorShape: TDef['errorShape']
        transformer: TDef['transformer']
      }>,
      TDef['output']
    >,
  ): DefinedUseTRPCQueryResult<
    TData,
    TRPCClientErrorLike<{
      errorShape: TDef['errorShape']
      transformer: TDef['transformer']
    }>
  >

  <TQueryFnData extends TDef['output'] = TDef['output'], TData = TQueryFnData>(
    input: TDef['input'] | SkipToken,
    opts?: UseTRPCQueryOptions<TQueryFnData, TData, TRPCClientErrorLike<TDef>, TDef['output']>,
  ): UseTRPCQueryResult<TData, TRPCClientErrorLike<TDef>>
}

type ProcedureUsePrefetchQuery<TDef extends ResolverDef> = (
  input: TDef['input'] | SkipToken,
  opts?: TRPCFetchQueryOptions<TDef['output'], TRPCClientErrorLike<TDef>>,
) => void

type CursorInput = {
  cursor?: any
} | void

type ReservedInfiniteQueryKeys = 'cursor' | 'direction'
type InfiniteInput<TInput> = Omit<TInput, ReservedInfiniteQueryKeys> | SkipToken

type inferCursorType<TInput> = TInput extends { cursor?: any } ? TInput['cursor'] : unknown

type makeInfiniteQueryOptions<TCursor, TOptions> = Omit<
  TOptions,
  'queryKey' | 'initialPageParam' | 'queryFn' | 'queryHash' | 'queryHashFn'
> &
  TRPCUseQueryBaseOptions & {
    initialCursor?: TCursor
  }

type trpcInfiniteData<TDef extends ResolverDef> = Simplify<
  InfiniteData<TDef['output'], inferCursorType<TDef['input']>>
>

interface useTRPCInfiniteQuery<TDef extends ResolverDef> {
  <TData = trpcInfiniteData<TDef>>(
    input: InfiniteInput<TDef['input']>,
    opts: makeInfiniteQueryOptions<
      inferCursorType<TDef['input']>,
      DefinedInitialDataInfiniteOptions<
        TDef['output'],
        TRPCClientErrorLike<TDef>,
        TData,
        any,
        inferCursorType<TDef['input']>
      >
    >,
  ): TRPCHookResult & DefinedUseInfiniteQueryResult<TData, TRPCClientErrorLike<TDef>>

  <TData = trpcInfiniteData<TDef>>(
    input: InfiniteInput<TDef['input']>,
    opts?: makeInfiniteQueryOptions<
      inferCursorType<TDef['input']>,
      UndefinedInitialDataInfiniteOptions<
        TDef['output'],
        TRPCClientErrorLike<TDef>,
        TData,
        any,
        inferCursorType<TDef['input']>
      >
    >,
  ): TRPCHookResult & UseInfiniteQueryResult<TData, TRPCClientErrorLike<TDef>>

  <TData = trpcInfiniteData<TDef>>(
    input: InfiniteInput<TDef['input']>,
    opts?: makeInfiniteQueryOptions<
      inferCursorType<TDef['input']>,
      UseInfiniteQueryOptions<
        TDef['output'],
        TRPCClientErrorLike<TDef>,
        TData,
        TDef['output'],
        any,
        inferCursorType<TDef['input']>
      >
    >,
  ): TRPCHookResult & UseInfiniteQueryResult<TData, TRPCClientErrorLike<TDef>>
}

type useTRPCSuspenseInfiniteQuery<TDef extends ResolverDef> = (
  input: InfiniteInput<TDef['input']>,
  opts: makeInfiniteQueryOptions<
    inferCursorType<TDef['input']>,
    UseSuspenseInfiniteQueryOptions<
      TDef['output'],
      TRPCClientErrorLike<TDef>,
      trpcInfiniteData<TDef>,
      TDef['output'],
      any,
      inferCursorType<TDef['input']>
    >
  >,
) => [
  trpcInfiniteData<TDef>,
  TRPCHookResult &
    UseSuspenseInfiniteQueryResult<trpcInfiniteData<TDef>, TRPCClientErrorLike<TDef>>,
]

type MaybeDecoratedInfiniteQuery<TDef extends ResolverDef> = TDef['input'] extends CursorInput
  ? {
      useInfiniteQuery: useTRPCInfiniteQuery<TDef>
      useSuspenseInfiniteQuery: useTRPCSuspenseInfiniteQuery<TDef>
      usePrefetchInfiniteQuery: (
        input: Omit<TDef['input'], ReservedInfiniteQueryKeys> | SkipToken,
        opts: TRPCFetchInfiniteQueryOptions<
          TDef['input'],
          TDef['output'],
          TRPCClientErrorLike<TDef>
        >,
      ) => void
    }
  : object

type DecoratedQueryMethods<TDef extends ResolverDef> = {
  useQuery: ProcedureUseQuery<TDef>
  usePrefetchQuery: ProcedureUsePrefetchQuery<TDef>
  useSuspenseQuery: <TQueryFnData extends TDef['output'] = TDef['output'], TData = TQueryFnData>(
    input: TDef['input'],
    opts?: UseTRPCSuspenseQueryOptions<TQueryFnData, TData, TRPCClientErrorLike<TDef>>,
  ) => [TData, UseSuspenseQueryResult<TData, TRPCClientErrorLike<TDef>> & TRPCHookResult]
}

export type DecoratedQuery<TDef extends ResolverDef> = MaybeDecoratedInfiniteQuery<TDef> &
  DecoratedQueryMethods<TDef>

export type DecoratedMutation<TDef extends ResolverDef> = {
  useMutation: <TContext = unknown>(
    opts?: UseTRPCMutationOptions<
      TDef['input'],
      TRPCClientErrorLike<TDef>,
      TDef['output'],
      TContext
    >,
  ) => UseTRPCMutationResult<TDef['output'], TRPCClientErrorLike<TDef>, TDef['input'], TContext>
}

export type DecoratedSubscription<TDef extends ResolverDef> = {
  useSubscription: {
    (
      input: TDef['input'],
      opts: UseTRPCSubscriptionOptions<TDef['output'], TRPCClientErrorLike<TDef>>,
    ): void

    (
      input: TDef['input'] | SkipToken,
      opts: Omit<UseTRPCSubscriptionOptions<TDef['output'], TRPCClientErrorLike<TDef>>, 'enabled'>,
    ): void
  }
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
              transformer: TRoot['transformer']
              errorShape: TRoot['errorShape']
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
