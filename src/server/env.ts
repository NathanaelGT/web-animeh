import { env } from '~/env'

export const mode = () => env.MODE

export const isDevelopment = () => env.MODE === 'development'

export const isTest = () => env.MODE === 'test'

export const isProduction = () => env.MODE === 'production'
