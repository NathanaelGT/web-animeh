import type { AnyProcedure } from '@trpc/server/unstable-core-do-not-import'

export type TRPCParams<TProcedure extends AnyProcedure> = TProcedure['_def']['$types']['input']

export type TRPCResponse<TProcedure extends AnyProcedure> = TProcedure['_def']['$types']['output']

export type NumericKeys<T extends readonly unknown[]> = Exclude<keyof T, keyof any[]>
