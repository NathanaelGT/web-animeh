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
    <main className="mb-auto bg-primary">
      <div className="flex aspect-video bg-primary-foreground/85">
        {status === undefined ? (
          <p className="m-auto">Sedang memuat data episode</p>
        ) : !status ? ( // string kosong = downloadnya pending
          <Download
            animeId={Number(params.id)}
            episodeNumber={Number(params.number)}
            isPending={status === ''}
          />
        ) : typeof status === 'string' ? (
          <div className="m-auto text-center">
            <DownloadProgress text={status} />
          </div>
        ) : (
          <VideoPlayer params={params} />
        )}
      </div>
    </main>
  )
}
