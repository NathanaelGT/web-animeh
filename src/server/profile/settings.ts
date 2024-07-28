import { z } from 'zod'
import { isProduction } from '~s/env' with { type: 'macro' }

export const settingsSchema = z.object({
  //
})

export const defaultSettings = () => {
  if (isProduction()) {
    return settingsSchema.parse({})
  } else {
    try {
      return settingsSchema.parse({})
    } catch {
      throw new Error('Please specify default or catch value for all settings')
    }
  }
}

export const parse = (settingsJson: unknown) => {
  try {
    return settingsSchema.parse(settingsJson)
  } catch {
    return defaultSettings()
  }
}
