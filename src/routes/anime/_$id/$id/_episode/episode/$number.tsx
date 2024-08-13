import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'
import { DownloadProgress } from '@/ui/custom/download-progress'

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
  let message: string
  if (typeof status === 'string') {
    message = status
  } else if (status === false) {
    message = 'belum terunduh'
  } else if (status) {
    message = 'ini video'
  } else {
    message = 'Memuat...'
  }

  return (
    <main className="bg-slate-100">
      <div className="flex aspect-video bg-slate-200">
        {typeof status === 'string' ? (
          <div className="m-auto text-center">
            <DownloadProgress text={message} />
          </div>
        ) : status ? (
          <video
            className="h-full w-full"
            controls
            src={`http://localhost:${import.meta.env.PROD ? 8888 : 8887}/videos/${params.id}/${episode.number.toString().padStart(2, '0')}.mp4`}
          />
        ) : (
          <p className="m-auto">{message}</p>
        )}
      </div>
    </main>
  )
}
