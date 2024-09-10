import * as v from 'valibot'
// @ts-ignore cuma import type
import type { keybindModifiers } from '~c/utils/keybind'

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

const createKeybind = (() => {
  const keybindArraySchema = v.pipe(v.array(v.string()), v.minLength(1))

  if (import.meta.env.PROD) {
    return (...defaultKeybind: AllowedDefaultKeybind) => {
      return v.fallback(keybindArraySchema, defaultKeybind)
    }
  }

  const existingKeybind = new Set<string>()

  return (...defaultKeybind: AllowedDefaultKeybind) => {
    const keybind = defaultKeybind.join(' ')

    if (existingKeybind.has(keybind)) {
      throw new Error(`Keybind "${keybind}" already exists`)
    }

    existingKeybind.add(keybind)

    return v.fallback(keybindArraySchema, defaultKeybind)
  }
})()

const optional = <const TWrapped extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  wrapped: TWrapped,
) => {
  // @ts-ignore
  const schema = v.optional(wrapped, {}) as TWrapped

  if (!import.meta.env.PROD) {
    const result = v.safeParse(schema, {})

    if (!result.success) {
      throw new Error('Please specify fallback value for all settings')
    }
  }

  return schema
}

export const keybindSchema = v.object({
  global: optional(
    v.object({
      search: createKeybind('/'),
    }),
  ),
  animePage: optional(
    v.object({
      watch: createKeybind('Enter'),
    }),
  ),
  videoPlayer: optional(
    v.object({
      back: createKeybind('ArrowLeft'),
      forward: createKeybind('ArrowRight'),
      longBack: createKeybind('Control', 'ArrowLeft'),
      longForward: createKeybind('Control', 'ArrowRight'),
      volumeUp: createKeybind('ArrowUp'),
      volumeDown: createKeybind('ArrowDown'),
      toStart: createKeybind('Home'),
      toEnd: createKeybind('End'),
      previous: createKeybind('p'),
      next: createKeybind('n'),
      mute: createKeybind('m'),
      PiP: createKeybind('i'),
      fullscreen: createKeybind('f'),
      playPause: createKeybind(' '),
    }),
  ),
})

export const settingsSchema = v.object({
  theme: v.fallback(v.picklist(themes), 'system'),
  headerPosition: v.fallback(v.picklist(headerPositions), 'hybrid'),
  episodeFilter: optional(episodeFilterSchema),
  keybind: optional(keybindSchema),
})

export const defaultSettings = () => v.parse(settingsSchema, {})

export const parse = (settingsJson: unknown) => {
  const result = v.safeParse(settingsSchema, settingsJson)

  return result.success ? result.output : defaultSettings()
}

export type AllowedDefaultModifier = (typeof keybindModifiers)[number]

export type AllowedDefaultKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '0'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | ' '
  | '``'
  | '-'
  | '='
  | '['
  | ']'
  | '\\'
  | ';'
  | "'"
  | ','
  | '.'
  | '/'
  | 'Enter'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End'

type AllowedDefaultKeybind =
  | [AllowedDefaultModifier, AllowedDefaultModifier, AllowedDefaultModifier, AllowedDefaultKey]
  | [AllowedDefaultModifier, AllowedDefaultModifier, AllowedDefaultKey]
  | [AllowedDefaultModifier, AllowedDefaultKey]
  | [AllowedDefaultKey]
