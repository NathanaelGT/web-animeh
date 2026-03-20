import { Store } from '@tanstack/store'
import { profileStore } from './profile'

const localStorageKey = 'profileName'

export const clientProfileNameStore = new Store(localStorage.getItem(localStorageKey))

profileStore.subscribe(() => {
  const name = profileStore.state?.name

  if (name) {
    clientProfileNameStore.setState(() => name)
    localStorage.setItem(localStorageKey, name)
  }
})
