import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  shared: {
    //
  },

  server: {
    MODE: z.enum(['development', 'test', 'production']).default('production'),
  },

  client: {
    //
  },

  clientPrefix: 'PUBLIC',
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
