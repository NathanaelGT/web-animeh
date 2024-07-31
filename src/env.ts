import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  shared: {
    //
  },

  server: {
    KURAMANIME_TLD: z.string(),
    PARALLEL_REQUEST_LIMIT: z.coerce.number().min(1),
  },

  client: {
    //
  },

  clientPrefix: 'PUBLIC',
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
