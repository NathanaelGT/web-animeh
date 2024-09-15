import { Store } from '@tanstack/store'

export const headerSubscribersStore = new Store(new Set<HTMLElement>())
