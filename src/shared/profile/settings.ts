import { z } from 'zod'

export const headerPositions = ['static', 'sticky', 'hybrid'] as const

export const episodeDisplayMode = ['Padat', 'Detail', 'Auto'] as const

export const episodeFilterSchema = z.object({
  displayMode: z.enum(episodeDisplayMode).catch('Auto'),
  sortLatest: z.boolean().catch(false),
  hideFiller: z.boolean().catch(false),
  hideRecap: z.boolean().catch(false),
  perPage: z.number().catch(100),
})

export const settingsSchema = z.object({
  headerPosition: z.enum(headerPositions).catch('hybrid'),
  episodeFilter: episodeFilterSchema.default({}),
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
