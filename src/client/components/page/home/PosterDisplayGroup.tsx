import { Link } from '@tanstack/react-router'
import { SimpleTooltip } from '@/ui/tooltip'
import { AnimePoster } from '@/Anime/Poster'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'

import type { RouteRouter } from '~s/trpc-procedures/route'
import type { TRPCResponse } from '~/shared/utils/types'

type Props = {
  animeList: TRPCResponse<(typeof RouteRouter)['/']>
}

export function PosterDisplayGroup({ animeList }: Props) {
  return animeList.map(animeData => (
    <div key={animeData.id} className="mx-auto max-w-[162px]">
      <AnimePoster small asLink anime={animeData}>
        {animeData.totalEpisodes && (
          <SimpleTooltip title={animeData.totalEpisodes + ' Episode'}>
            <span className="absolute bottom-2 left-2 rounded-md bg-slate-600/75 px-1 text-primary-foreground">
              {animeData.totalEpisodes}
            </span>
          </SimpleTooltip>
        )}
      </AnimePoster>

      <SimpleTooltip title={animeData.title}>
        <Link
          to="/anime/$id"
          params={{ id: animeData.id.toString() }}
          className="mt-1 block truncate text-sm font-bold"
        >
          {animeData.title}
        </Link>
      </SimpleTooltip>

      <div className="flex justify-between text-xs text-slate-500 [&>*]:bg-transparent [&>*]:p-0">
        <AnimeType type={animeData.type} />
        <AnimeRating rating={animeData.rating} />
        <AnimeDuration duration={animeData.duration} />
        <AnimeEpisode episode={animeData.totalEpisodes} />
      </div>
    </div>
  ))
}
