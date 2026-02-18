import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { useState, useLayoutEffect } from 'react'
import { episodeListStore } from '~c/stores'
import { Download } from '@/page/anime/episode/number/Download'
import { Status } from '@/page/anime/episode/number/Status'
import { VideoPlayer } from '@/page/anime/episode/number/VideoPlayer'
import { VideoPlayerOrStatus } from '@/page/anime/episode/number/VideoPlayerOrStatus'
import { EpisodeStateIcon } from '@/ui/custom/episode-state-icon'
import { searchEpisode } from '~/shared/utils/episode'

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
        ) : status === 'OTHER' ? (
          <Status icon={<EpisodeStateIcon data={download} />}>{download.text}</Status>
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
