import { useState, useLayoutEffect } from 'react'
import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { Status } from '@/page/anime/episode/number/Status'
import { Download } from '@/page/anime/episode/number/Download'
import { VideoPlayer } from '@/page/anime/episode/number/VideoPlayer'
import { VideoPlayerOrStatus } from '@/page/anime/episode/number/VideoPlayerOrStatus'

export const Route = createFileRoute('/anime/_$id/$id/_episode/episode/$number')({
  component: EpisodeNumber,
})

function EpisodeNumber() {
  const [streamingUrl, setStreamingUrl] = useState<string | undefined>()
  const params = Route.useParams()
  const episode = useStore(episodeListStore, episodeList => {
    return searchEpisode(episodeList, Number(params.number))
  })

  useLayoutEffect(() => {
    setStreamingUrl(undefined)
  }, [params.id, params.number])

  if (!episode) {
    return <main className="m-auto">Episode {params.number} tidak ditemukan</main>
  }

  const { download } = episode
  const { status } = download

  return (
    <main className="mb-auto">
      <div className="flex aspect-video bg-primary-foreground/85">
        {status === 'DOWNLOADING' ? (
          <VideoPlayerOrStatus
            key={`${params.id}|${params.number}`}
            params={params}
            progress={download.progress}
          />
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
        ) : status === 'DOWNLOADED' || streamingUrl ? (
          <VideoPlayer
            key={`${params.id}|${params.number}`}
            streamingUrl={streamingUrl}
            params={params}
          />
        ) : status === 'NOT_DOWNLOADED' ? (
          <Download params={params} setStreamingUrl={setStreamingUrl} />
        ) : status === 'RESUME' ? (
          <Download params={params} setStreamingUrl={setStreamingUrl} isPending />
        ) : (
          <p>Status tidak diketahui: {status}</p>
        )}
      </div>
    </main>
  )
}
