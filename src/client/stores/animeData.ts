import { Store } from '@tanstack/store'
import { fetchRouteData } from '~c/route'
import type { TRPCResponse } from '~/shared/utils/types'

export const animeDataStore = new Store<
  TRPCResponse<(typeof import('~s/trpc-procedures/route'))['RouteRouter']['/anime/_$id']>
>(null as never)

animeDataStore.subscribe(async () => {
  const animeData = animeDataStore.state
  if (animeData === null) {
    return
  }

  const { ref } = animeData
  if (ref) {
    const newAnimeData = await fetchRouteData('/anime/_$id', { id: animeData.id, ref })

    if (animeDataStore?.state.id === newAnimeData.id) {
      animeDataStore.setState(() => newAnimeData)
    }
  }
})
