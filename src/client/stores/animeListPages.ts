import { Store } from '@tanstack/store'
import type { RouteRouter } from '~s/trpc-procedures/route'
import type { TRPCResponse } from '~/shared/utils/types'

type AnimeList = TRPCResponse<(typeof RouteRouter)['/']>
export const animeListPages = new Store<AnimeList[]>(null as never)
