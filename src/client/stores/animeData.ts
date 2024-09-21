import { Store } from '@tanstack/store'
import type { TRPCResponse } from '~/shared/utils/types'

export const animeDataStore = new Store<
  TRPCResponse<(typeof import('~s/trpc-procedures/route'))['RouteRouter']['/anime/_$id']>[0]
>(null as never)
