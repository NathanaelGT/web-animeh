import { clientProfileSettingsStore } from '~c/stores'
import { captureKeybindFromEvent, keybindCombinationsMatch } from '~c/utils/keybind'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

export const createGlobalKeydownHandler = (handler: (event: KeyboardEvent) => void) => {
  const keybindHandler = (event: KeyboardEvent) => {
    const { target } = event

    if (
      target instanceof HTMLElement &&
      (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) ||
        (target.tabIndex === 0 && target.tagName !== 'VIDEO'))
    ) {
      return
    }

    handler(event)
  }

  document.body.addEventListener('keydown', keybindHandler)

  return () => {
    document.body.removeEventListener('keydown', keybindHandler)
  }
}

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']

export const createKeybindHandler = <TGroup extends keyof KeybindGroups>(
  keybindGroup: TGroup,
  keybindName: keyof KeybindGroups[TGroup],
  handler: (event: KeyboardEvent) => void,
) => {
  return createGlobalKeydownHandler(event => {
    const capturedCombination = captureKeybindFromEvent(event)
    const combination = clientProfileSettingsStore.state.keybind[keybindGroup][
      keybindName
    ] as string[]

    if (!keybindCombinationsMatch(combination, capturedCombination)) {
      return
    }

    event.preventDefault()

    handler(event)
  })
}
