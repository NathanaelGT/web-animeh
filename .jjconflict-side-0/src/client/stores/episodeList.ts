import { Store } from '@tanstack/store'
import type { TRPCResponse } from '~/shared/utils/types'
import type { RouteRouter } from '~s/trpc-procedures/route'

export type EpisodeList = TRPCResponse<(typeof RouteRouter)['/anime/_$id/$id/_episode']>

export const episodeListStore = new Store<EpisodeList>(null as never)
