import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { Download } from '@/page/anime/episode/number/Download'
import { VideoPlayer } from '@/page/anime/episode/number/VideoPlayer'
import type { PropsWithChildren, ReactElement } from 'react'

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

  const { download } = episode
  const { status } = download

  return (
    <main className="mb-auto">
      <div className="flex aspect-video bg-primary-foreground/85">
        {status === 'DOWNLOADING' ? (
          <Status
            icon={<DownloadIcon />}
            progress={<DownloadProgress progress={download.progress} />}
          >
            Mengunduh
          </Status>
        ) : status === 'OPTIMIZING' ? (
          <Status
            icon={<Wand />}
            progress={<OptimalizationProgress progress={download.progress} />}
          >
            Mengoptimalisasi video
          </Status>
        ) : status === 'OTHER' ? (
          <Status
            icon={
              download.text === 'Video selesai diunduh' ? (
                <CircleCheckBig />
              ) : download.text.startsWith('Menunggu') ? (
                <Hourglass />
              ) : (
                <LoaderCircle className="animate-spin" />
              )
            }
          >
            {download.text}
          </Status>
        ) : status === 'DOWNLOADED' ? (
          <VideoPlayer key={`${params.id}|${params.number}`} params={params} />
        ) : status === 'NOT_DOWNLOADED' ? (
          <Download params={params} />
        ) : status === 'RESUME' ? (
          <Download params={params} isPending />
        ) : (
          <p>Status tidak diketahui: {status}</p>
        )}
      </div>
    </main>
  )
}

type StatusProps = PropsWithChildren<{
  icon: ReactElement
  progress?: ReactElement
}>

function Status({ icon, progress, children }: StatusProps) {
  return (
    <div className="m-auto grid w-11/12 gap-2 lg:max-w-xl">
      <div className="mx-auto flex gap-2">
        <div className="w-6">{icon}</div>

        <p className="flex-1">{children}</p>
      </div>

      {progress}
    </div>
  )
}
