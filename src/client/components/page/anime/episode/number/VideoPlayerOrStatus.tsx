import { DownloadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
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
  const [canStream, setCanStream] = useState<boolean | undefined>()
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const isInit = canStream === undefined

  const meta = useRef<{ errorRetryCount: number; errorTimeoutId?: NodeJS.Timeout }>({
    errorRetryCount: 0,
  })

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

      {isInit && (
        <video
          src={getSrc(params.id, params.number)}
          onLoadedData={() => {
            setCanStream(true)
            clearTimeout(meta.current.errorTimeoutId)
          }}
          onError={error => {
            // 5 percobaan pertama tiap 0.5 detik
            // diatas itu tiap percobaan nambah 0.5 detik, maks 30 detik
            const ms = Math.min(Math.max(meta.current.errorRetryCount++ - 4, 1) * 500, 30000)

            meta.current.errorTimeoutId = setTimeout(() => {
              // gatau kenapa error.currentTarget null
              ;(error.target as HTMLVideoElement).load()
            }, ms)
          }}
          className="hidden"
        />
      )}

      {showVideoPlayer && <VideoPlayer streamingUrl={undefined} params={params} />}
    </>
  )
}
