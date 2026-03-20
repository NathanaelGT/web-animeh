import mitt from 'mitt'
import type * as episodeRepository from '~s/db/repository/episode'

type AnimeId = string

export const episodeMitt = mitt<Record<AnimeId, episodeRepository.EpisodeList>>()
