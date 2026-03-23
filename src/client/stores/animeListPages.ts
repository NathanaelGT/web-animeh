import { Store } from '@tanstack/store'
import type { TRPCResponse } from '~/shared/utils/types'
import type { RouteRouter } from '~s/trpc-procedures/route'

type AnimeList = TRPCResponse<(typeof RouteRouter)['/']>
export const animeListPages = new Store<AnimeList[]>(null as never)
