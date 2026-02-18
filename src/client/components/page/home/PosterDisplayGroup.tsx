import { memo, useState, useEffect } from 'react'
import { animeListPages } from '~c/stores'
import { AnimeTitle } from '@/Anime/Title'
import { AnimePoster } from '@/Anime/Poster'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'

type Props = {
  index: number
}

export const PosterDisplayGroup = memo(function PosterDisplayGroup({ index }: Props) {
  const [shouldRender, setShouldRender] = useState(
    index === 0 || (animeListPages.state ?? []).length - 1 === index,
  )

  useEffect(() => {
    if (shouldRender) {
      return
    }

    let timeoutId: Timer | null = setTimeout(() => {
      timeoutId = null

      setShouldRender(true)
    }, index * 80)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [shouldRender])

  if (animeListPages.state === null) {
    return []
  }

  const animeDataList = animeListPages.state[index]!

  if (!shouldRender) {
    return animeDataList.map(animeData => (
      <div key={animeData.id} className="h-[calc(229px+2.5rem)] w-[162px]" />
    ))
  }

  return animeDataList.map(animeData => (
    <div key={animeData.id} className="mx-auto w-[162px]">
      <AnimePoster small asLink anime={animeData} tabIndex={-1} />

      <AnimeTitle
        animeData={animeData}
        withTooltip
        asLink
        className="mt-1 block truncate text-sm font-bold"
      />

      <div className="flex justify-between text-xs text-slate-500 *:bg-transparent *:p-0">
        <AnimeType type={animeData.type} />
        <AnimeRating rating={animeData.rating} />
        <AnimeDuration duration={animeData.duration} />
        <AnimeEpisode episode={animeData.totalEpisodes} />
      </div>
    </div>
  ))
})
