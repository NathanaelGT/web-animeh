import { Store } from '@tanstack/store'
import { parse, defaultSettings } from '~/shared/profile/settings'
import { profileStore } from './profile'

const localStorageKey = 'profileSettings'

export const clientProfileSettingsStore = new Store(
  (() => {
    const rawSettings = localStorage.getItem(localStorageKey)

    if (rawSettings) {
      try {
        return parse(JSON.parse(rawSettings))
      } catch {
        localStorage.removeItem(localStorageKey)
      }
    }

    return defaultSettings()
  })(),
)

profileStore.subscribe(() => {
  const settings = profileStore.state?.settings

  if (settings) {
    clientProfileSettingsStore.setState(() => settings)
    localStorage.setItem(localStorageKey, JSON.stringify(settings))
  }
})
