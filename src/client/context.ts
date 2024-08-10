import { createContext } from 'react'
import type { RouteRouter } from '~s/trpc-procedures/route'
import type { TRPCResponse } from '~/shared/utils/types'

export type AnimeData = TRPCResponse<(typeof RouteRouter)['/anime/_$id']>
export const AnimeDataContext = createContext<AnimeData>(null as never)

export type EpisodeList = TRPCResponse<(typeof RouteRouter)['/anime/_$id/$id/_episode']>
export const EpisodeListContext = createContext<EpisodeList>(null as never)
