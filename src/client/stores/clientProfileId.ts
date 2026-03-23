import { Store } from '@tanstack/store'
import { profileStore } from './profile'

const localStorageKey = 'profileId'

export const clientProfileIdStore = new Store(localStorage.getItem(localStorageKey))

profileStore.subscribe(() => {
  const id = profileStore.state?.id

  if (id) {
    clientProfileIdStore.setState(() => id)
    localStorage.setItem(localStorageKey, id)
  }
})
