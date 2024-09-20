import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
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
          <StringStatus status={status} />
        ) : (
          <VideoPlayer params={params} />
        )}
      </div>
    </main>
  )
}

type StringStatusProps = {
  status: string
}

function StringStatus({ status }: StringStatusProps) {
  const isDownloading = status.startsWith('Mengunduh: ')
  const isOptimizing = !isDownloading && status.startsWith('Mengoptimalisasi video')

  return (
    <div className="m-auto grid w-11/12 gap-2 lg:max-w-xl">
      <div className="mx-auto flex gap-2">
        <div className="w-6">
          {isDownloading ? (
            <DownloadIcon className="w-6" />
          ) : status === 'Menunggu unduhan sebelumnya' ? (
            <Hourglass />
          ) : status === 'Video selesai diunduh' ? (
            <CircleCheckBig />
          ) : (
            <LoaderCircle className="animate-spin" />
          )}
        </div>

        {!isOptimizing && <p className="flex-1">{isDownloading ? 'Mengunduh' : status}</p>}
      </div>

      {isDownloading ? (
        <DownloadProgress text={status} />
      ) : (
        isOptimizing && <OptimalizationProgress text={status} />
      )}
    </div>
  )
}
