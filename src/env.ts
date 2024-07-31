import { createEnv } from '@t3-oss/env-core'

export const env = createEnv({
  shared: {
    //
  },

  server: {
    //
  },

  client: {
    //
  },

  clientPrefix: 'PUBLIC',
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
