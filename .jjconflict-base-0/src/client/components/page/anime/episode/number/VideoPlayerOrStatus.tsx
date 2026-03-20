import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { Status } from '@/page/anime/episode/number/Status'
import { VideoPlayer, getSrc } from '@/page/anime/episode/number/VideoPlayer'
import { Button } from '@/ui/button'
import { DownloadProgress } from '@/ui/custom/download-progress'
import type { DownloadProgress as Progress } from '~s/external/download/progress'

type Props = {
  params: {
    id: string
    number: string
  }
  progress: Progress
}

export function VideoPlayerOrStatus({ params, progress }: Props) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)

  if (showVideoPlayer) {
    return <VideoPlayer streamingUrl={getSrc(params.id, params.number)} params={params} />
  }

  return (
    <Status
      icon={<DownloadIcon />}
      progress={<DownloadProgress progress={progress} />}
      suffix={
        progress.faststart ? (
          <Button
            variant="secondary"
            onClick={() => setShowVideoPlayer(true)}
            className="animate-in fade-in"
          >
            Nonton Sekarang
          </Button>
        ) : undefined
      }
    >
      Mengunduh
    </Status>
  )
}
