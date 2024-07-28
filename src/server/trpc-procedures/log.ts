import { z } from 'zod'
import { procedure } from '~s/trpc'
import { logger } from '~s/utils/logger'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type UnionToTuple<U> =
  UnionToIntersection<U extends any ? (t: U) => void : never> extends (a: infer A) => void
    ? [...UnionToTuple<Exclude<U, A>>, A]
    : []

export const LogProcedure = procedure
  .input(
    z.object({
      level: z.enum(Object.keys(logger) as UnionToTuple<keyof typeof logger>),
      message: z.string(),
      context: z.record(z.unknown()).default({}),
    }),
  )
  .mutation(({ input, ctx }) => {
    input.context = { client: ctx.data, ...input.context }

    logger[input.level](input.message, input.context)
  })
