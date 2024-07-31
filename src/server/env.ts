import z from 'zod'

const _mode = z
  .enum(['development', 'test', 'production'])
  .default('production')
  .parse(process.env.MODE)

export const mode = () => _mode

export const isDevelopment = () => _mode === 'development'

export const isTest = () => _mode === 'test'

export const isProduction = () => _mode === 'production'
