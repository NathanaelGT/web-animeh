import { z } from 'zod'

export const headerPositions = ['static', 'sticky', 'hybrid'] as const

export const settingsSchema = z.object({
  headerPosition: z.enum(headerPositions).catch('hybrid'),
})

export const defaultSettings = () => {
  if (import.meta.env.PROD) {
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
