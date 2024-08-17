import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  shared: {
    //
  },

  server: {
    KURAMANIME_TLD: z.string(),
    PREDOWNLOAD_VIDEO_METADATA_AT_LESS_THAN_MB: z.coerce.number().min(0),
    PARALLEL_REQUEST_LIMIT: z.coerce.number().min(1),
    PARALLEL_DOWNLOAD_LIMIT: z.coerce.number().min(1),
  },

  client: {
    //
  },

  clientPrefix: 'PUBLIC',
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
