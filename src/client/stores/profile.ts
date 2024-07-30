import { Store } from '@tanstack/store'
import { transformResult } from '@trpc/server/unstable-core-do-not-import'
import SuperJSON from 'superjson'
import { wsClient } from '~c/trpc'
import type { ProfileRouter } from '~s/trpc-procedures/profile'
import type { TRPCResponse } from '~/shared/utils/types'

type Profile = TRPCResponse<(typeof ProfileRouter)['subs']>

export const profileStore = new Store<Profile | null>(null)

// store ini diimport sama module yang ngehandle wsClient
// untuk menghindari wsClient belum didefine, jadi didelay sebentar requestnya
queueMicrotask(() => {
  wsClient.request(
    {
      type: 'subscription',
      path: 'profile.subs',
      id: 'profile.subs' as unknown as number,
      input: '',
      context: {},
      signal: null,
    },
    {
      complete() {},
      error() {},
      next(message) {
        const transformed = transformResult(message, SuperJSON)

        if (!transformed.ok) {
          // ?

          return
        }

        if (transformed.result.type !== 'data') {
          return
        }

        const profile = transformed.result.data as Profile

        profileStore.setState(() => profile)
      },
    },
  )
})
