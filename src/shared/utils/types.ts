import type { AnyProcedure } from '@trpc/server/unstable-core-do-not-import'

export type TRPCResponse<TProcedure extends AnyProcedure> =
  TProcedure['_def']['$types']['output']
