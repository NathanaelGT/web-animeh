import * as v from 'valibot'
import { procedure } from '~s/trpc'
import { logger, type LoggerLevel } from '~s/utils/logger'

export const LogProcedure = procedure
  .input(
    v.parser(
      v.object({
        level: v.picklist(['info', 'warn', 'error', 'debug'] satisfies LoggerLevel[]),
        message: v.string(),
        context: v.optional(v.record(v.string(), v.unknown()), {}),
      }),
    ),
  )
  .mutation(({ input, ctx }) => {
    input.context = { client: ctx.data, ...input.context }

    logger[input.level](input.message, input.context)
  })
