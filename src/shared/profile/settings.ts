import * as v from 'valibot'

export const themes = ['dark', 'light', 'system'] as const

export const headerPositions = ['static', 'sticky', 'hybrid'] as const

export const episodeDisplayMode = ['Padat', 'Detail', 'Auto'] as const

export const episodeFilterSchema = v.object({
  displayMode: v.fallback(v.picklist(episodeDisplayMode), 'Auto'),
  sortLatest: v.fallback(v.boolean(), false),
  hideFiller: v.fallback(v.boolean(), false),
  hideRecap: v.fallback(v.boolean(), false),
  perPage: v.fallback(v.number(), 100),
})

export const settingsSchema = v.object({
  theme: v.fallback(v.picklist(themes), 'system'),
  headerPosition: v.fallback(v.picklist(headerPositions), 'hybrid'),
  // @ts-ignore semua field di episodeFilterSchema ada fallbacknya
  episodeFilter: v.optional(episodeFilterSchema, {}) as typeof episodeFilterSchema,
})

export const defaultSettings = () => {
  if (import.meta.env.PROD) {
    return v.parse(settingsSchema, {})
  } else {
    try {
      return v.parse(settingsSchema, {})
    } catch {
      throw new Error('Please specify default or catch value for all settings')
    }
  }
}

export const parse = (settingsJson: unknown) => {
  try {
    return v.parse(settingsSchema, settingsJson)
  } catch {
    return defaultSettings()
  }
}
