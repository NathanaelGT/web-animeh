import type { AllowedDefaultModifier, AllowedDefaultKey } from '~/shared/profile/settings'

export const keybindModifiers = ['Control', 'Shift', 'Alt'] as const

export const captureKeybindFromEvent = (
  event: React.KeyboardEvent<HTMLElement> | KeyboardEvent,
) => {
  const combination: string[] = []

  if (event.ctrlKey) combination.push(keybindModifiers[0])
  if (event.shiftKey) combination.push(keybindModifiers[1])
  if (event.altKey) combination.push(keybindModifiers[2])

  if (
    event.key !== 'Unidentified' &&
    !(keybindModifiers as unknown as string[]).includes(event.key)
  ) {
    combination.push(event.key.length === 1 && event.shiftKey ? event.key.toLowerCase() : event.key)
  }

  return combination
}

export const keybindCombinationsMatch = (
  keybindCombination: string[],
  eventCombination: string[],
) => {
  if (keybindCombination.length === 0 || keybindCombination.length !== eventCombination.length) {
    return false
  }

  for (let i = 0; i < keybindCombination.length; i++) {
    if (keybindCombination[i] !== eventCombination[i]) {
      return false
    }
  }

  return true
}

export const createKeybindMatcher = (event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => {
  const capturedCombination = captureKeybindFromEvent(event)

  const keybindMatch = ((combinationToMatch: string[]) => {
    return keybindCombinationsMatch(combinationToMatch, capturedCombination)
  }) as ((combinationToMatch: string[]) => boolean) & { capturedCombination: string[] }

  keybindMatch.capturedCombination = capturedCombination

  return keybindMatch
}

export const formatKeybind = (key: string) => {
  const map: Record<string, string> = {
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Enter': '↵',
    'Control': 'Ctrl',
    ' ': 'Space',
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    '{': '[',
    '}': ']',
    '|': '\\',
    ':': ';',
    '"': "'",
    '<': ',',
    '>': '.',
    '?': '/',
  } satisfies Partial<Record<AllowedDefaultModifier | AllowedDefaultKey | (string & {}), string>>

  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}
