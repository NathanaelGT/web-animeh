import * as v from 'valibot'
import type { keybindModifiers } from '~/shared/utils/keybind'

export const themes = ['dark', 'light', 'system'] as const

export const headerPositions = ['static', 'sticky', 'hybrid'] as const

export const episodeDisplayMode = ['Padat', 'Detail', 'Auto'] as const

export const miniplayerMode = ['Smart', 'Selalu', 'No Auto'] as const

export const backupStateMode = ['Smart', 'On Pause', 'Disable'] as const

export const episodeFilterSchema = object({
  displayMode: picklist(episodeDisplayMode, 'Auto'),
  sortLatest: boolean(false),
  hideFiller: boolean(false),
  hideRecap: boolean(false),
  perPage: number(100),
})

export const animeFilterSchema = object({
  hideRating: v.fallback(v.array(v.string()), []),
  hideGenre: v.fallback(v.array(v.number()), []),
})

export const videoPlayerSchema = object({
  jumpSec: number(5, 0.1),
  longJumpSec: number(87, 0.1),
  relativeJump: boolean(true),
  relativeLongJump: boolean(false),
  volumeStep: number(0.05, 0.01, 1),
  miniplayerMode: picklist(miniplayerMode, 'Smart'),
  miniplayerAnimationDuration: number(300),
  backupStateMode: picklist(backupStateMode, 'Smart'),
  defaultSpeed: number(1, 0.1, 8),
  speedStep: number(0.05, 0.01, 1),
  smartJumpOffset: number(750, 0, 2500),
})

export const keybindSchema = object({
  global: object({
    search: createKeybind('/'),
    showKeybindTips: createKeybind('Alt'),
  }),
  search: object({
    up: createKeybind('ArrowUp'),
    down: createKeybind('ArrowDown'),
  }),
  animePage: object({
    watch: createKeybind('Enter'),
  }),
  watchPage: object({
    search: createKeybind('e'),
    download: createKeybind('u'),
    streaming: createKeybind('Enter'),
    first: createKeybind('Shift', 'p'),
    last: createKeybind('Shift', 'n'),
  }),
  videoPlayer: object({
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
    miniplayer: createKeybind('i'),
    PiP: createKeybind('Shift', 'i'),
    fullscreen: createKeybind('f'),
    playPause: createKeybind(' '),
    decreaseSpeed: createKeybind('a'),
    increaseSpeed: createKeybind('d'),
    toggleSpeed: createKeybind('s'),
  }),
})

export const settingsSchema = v.object({
  theme: picklist(themes, 'system'),
  headerPosition: picklist(headerPositions, 'hybrid'),
  episodeFilter: episodeFilterSchema,
  animeFilter: animeFilterSchema,
  videoPlayer: videoPlayerSchema,
  keybind: keybindSchema,
})

export const defaultSettings = () => v.parse(settingsSchema, {})

export const parse = (settingsJson: unknown) => {
  const result = v.safeParse(settingsSchema, settingsJson)

  return result.success ? result.output : defaultSettings()
}

function boolean(fallback: boolean) {
  return v.fallback(v.boolean(), fallback)
}

function picklist<TOptions extends v.PicklistOptions>(
  options: TOptions,
  fallback: TOptions[number],
) {
  return v.fallback(v.picklist(options), fallback)
}

function object<
  TEntries extends v.ObjectEntries,
  TReturn extends v.ObjectSchema<TEntries, undefined>,
>(entries: TEntries): TReturn {
  // @ts-ignore
  const schema = v.optional(v.object(entries), {}) as TReturn

  if (!import.meta.env.PROD) {
    const result = v.safeParse(schema, {})

    if (!result.success) {
      throw new Error('Please specify fallback value for all settings')
    }
  }

  return schema
}

function number(
  fallback: number,
  min?: number,
  max?: number,
): ReturnType<typeof v.fallback<ReturnType<typeof v.number>, number>> {
  const pipe = []

  if (min !== undefined) {
    pipe.push(v.minValue(min))
  }
  if (max !== undefined) {
    pipe.push(v.maxValue(max))
  }

  // @ts-ignore
  return v.fallback(v.pipe(v.number(), ...pipe), fallback)
}

function createKeybind(...defaultKeybind: AllowedDefaultKeybind) {
  return v.fallback(v.array(v.string()), defaultKeybind)
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
  | [AllowedDefaultModifier]
  | [AllowedDefaultKey]
