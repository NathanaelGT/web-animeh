import * as v from 'valibot'

const _mode = v.parse(
  v.optional(v.picklist(['development', 'test', 'production']), 'production'),
  process.env.MODE,
)

export const mode = () => _mode

export const isDevelopment = () => _mode === 'development'

export const isTest = () => _mode === 'test'

export const isProduction = () => _mode === 'production'
