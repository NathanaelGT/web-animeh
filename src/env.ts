import * as v from 'valibot'

const number = (min: number) => {
  return v.pipe(
    v.unknown(),
    v.transform(Number),
    v.check(input => !isNaN(input)),
    v.minValue(min),
  )
}

const schema = v.object({
  PREDOWNLOAD_VIDEO_METADATA_AT_LESS_THAN_MB: number(0),
  PARALLEL_REQUEST_LIMIT: number(1),
  PARALLEL_DOWNLOAD_LIMIT: number(1),
  SERVER_STARTED_HOOK: v.optional(v.string()),
})

const transformedEnv = process.env
for (const key in transformedEnv) {
  if (transformedEnv[key] === '') {
    delete transformedEnv[key]
  }
}

export const env = v.parse(schema, transformedEnv)
