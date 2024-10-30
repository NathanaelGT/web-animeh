import { Store } from '@tanstack/store'
import type { RouteRouter } from '~s/trpc-procedures/route'
import type { TRPCResponse } from '~/shared/utils/types'

export type EpisodeList = TRPCResponse<(typeof RouteRouter)['/anime/_$id/$id/_episode']>

export const episodeListStore = new Store<EpisodeList>(null as never)
