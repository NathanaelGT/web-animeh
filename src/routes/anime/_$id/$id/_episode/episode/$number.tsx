import { useContext, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { EpisodeListContext } from '~c/context'
import { searchEpisode } from '~/shared/utils/episode'

export const Route = createFileRoute('/anime/_$id/$id/_episode/episode/$number')({
  component: EpisodeNumber,
})

function EpisodeNumber() {
  const episodeList = useContext(EpisodeListContext)
  const params = Route.useParams()

  const episode = useMemo(() => {
    return searchEpisode(episodeList, Number(params.number))
  }, [episodeList.length])

  if (!episode) {
    return <div>Not found</div>
  }

  return (
    <main className="bg-slate-100">
      <div className="flex aspect-video bg-slate-200">
        <p className="m-auto">ini video</p>
      </div>
    </main>
  )
}
