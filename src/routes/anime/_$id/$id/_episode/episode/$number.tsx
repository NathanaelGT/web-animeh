import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
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
    return <main className="m-auto">Episode {params.number} tidak ditemukan</main>
  }

  const status = episode.downloadStatus as typeof episode.downloadStatus | undefined

  return (
    <main className="mb-auto">
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
          <div className="m-auto grid gap-2">
            <div className="mx-auto flex gap-2">
              <div className="w-6">
                {status.startsWith('Mengunduh: ') ? (
                  <DownloadIcon className="w-6" />
                ) : status === 'Menunggu unduhan sebelumnya' ? (
                  <Hourglass />
                ) : status === 'Video selesai diunduh' ? (
                  <CircleCheckBig />
                ) : (
                  <LoaderCircle className="animate-spin" />
                )}
              </div>

              <p className="flex-1">{status.startsWith('Mengunduh: ') ? 'Mengunduh' : status}</p>
            </div>

            {status.startsWith('Mengunduh:') && <DownloadProgress text={status} />}
          </div>
        ) : (
          <VideoPlayer params={params} />
        )}
      </div>
    </main>
  )
}
