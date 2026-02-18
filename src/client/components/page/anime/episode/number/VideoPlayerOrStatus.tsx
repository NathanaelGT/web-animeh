import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { Status } from '@/page/anime/episode/number/Status'
import { VideoPlayer } from '@/page/anime/episode/number/VideoPlayer'
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
  const [canStream, setCanStream] = useState<boolean | undefined>()
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const isInit = canStream === undefined

  return (
    <>
      {!showVideoPlayer && (
        <Status
          icon={<DownloadIcon />}
          progress={<DownloadProgress progress={progress} />}
          suffix={
            canStream ? (
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
      )}

      {(showVideoPlayer || isInit) && (
        <VideoPlayer
          streamingUrl={undefined}
          params={params}
          onLoad={() => {
            setCanStream(true)
          }}
          className={isInit ? 'hidden' : undefined}
        />
      )}
    </>
  )
}
