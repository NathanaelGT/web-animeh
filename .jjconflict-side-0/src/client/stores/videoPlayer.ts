import { Store } from '@tanstack/store'

export const videoPlayerStore = new Store({
  id: null as string | null,
  ep: null as string | null,
  session: null as string | null,
})
