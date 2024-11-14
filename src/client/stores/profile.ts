import { Store } from '@tanstack/store'
import { rpc } from '~c/trpc'
import type { ProfileRouter } from '~s/trpc-procedures/profile'
import type { TRPCResponse } from '~/shared/utils/types'

type Profile = TRPCResponse<(typeof ProfileRouter)['subs']>

export const profileStore = new Store<Profile | null>(null)

// store ini diimport sama module yang ngehandle rpc
// untuk menghindari rpc belum didefine, jadi didelay sebentar requestnya
queueMicrotask(() => {
  rpc.profile.subs.subscribe(undefined, {
    onData(profile) {
      profileStore.setState(() => profile)
    },
  })
})
