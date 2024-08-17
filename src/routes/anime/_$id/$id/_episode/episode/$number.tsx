import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { Download } from '@/page/anime/episode/number/Download'
import { VideoPlayer } from '@/page/anime/episode/number/VideoPlayer'

export const Route = createFileRoute('/anime/_$id/$id/_episode/episode/$number')({
  component: EpisodeNumber,
})

function EpisodeNumber() {
  const params = Route.useParams()
  const episode = useStore(episodeListStore, episodeList => {
    return searchEpisode(episodeList, Number(params.number))
  })

  if (!episode) {
    return <div>Not found</div>
  }

  const status = episode.downloadStatus as string | boolean | undefined

  return (
    <main className="bg-slate-100">
      <div className="flex aspect-video bg-slate-200">
        {typeof status === 'string' ? (
          <div className="m-auto text-center">
            <DownloadProgress text={status} />
          </div>
        ) : status ? (
          <VideoPlayer params={params} />
        ) : status === false ? (
          <Download animeId={Number(params.id)} episodeNumber={Number(params.number)} />
        ) : (
          <p className="m-auto">Sedang memuat data episode</p>
        )}
      </div>
    </main>
  )
}
