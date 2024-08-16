import { useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { episodeListStore } from '~c/stores'
import { searchEpisode } from '~/shared/utils/episode'

type Props = {
  params: {
    id: string
    number: string
  }
  className?: string
}

export function VideoPlayer({ params, className }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    video.muted = true
    video.play().then(() => {
      video.muted = false
    })

    const keybindHandler = (event: KeyboardEvent) => {
      const video = videoRef.current
      if (!video) {
        return
      }

      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)
      ) {
        return
      }

      if (event.ctrlKey) {
        const handler = {
          ArrowLeft() {
            video.currentTime -= 87
          },

          ArrowRight() {
            video.currentTime += 87
          },
        }[event.key]

        if (handler) {
          event.preventDefault()
          handler()
        }
      } else {
        const changeEpisode = (episodeTarget: number) => {
          if (!searchEpisode(episodeListStore.state, episodeTarget)) {
            return
          }

          router.navigate({
            to: '/anime/$id/episode/$number',
            params: {
              id: params.id,
              number: String(episodeTarget),
            },
          })
        }

        const handler = {
          p() {
            changeEpisode(Number(params.number) - 1)
          },

          n() {
            changeEpisode(Number(params.number) + 1)
          },

          f() {
            if (document.fullscreenElement === video) {
              document.exitFullscreen()
            } else {
              video.requestFullscreen()
            }
          },

          [' ']() {
            if (document.activeElement === video) {
              return
            }

            if (video.paused) {
              video.play()
            } else {
              video.pause()
            }
          },
        }[event.key]

        if (handler) {
          event.preventDefault()
          handler()
        }
      }
    }

    window.addEventListener('keydown', keybindHandler)

    return () => {
      window.removeEventListener('keydown', keybindHandler)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src={`http://localhost:${import.meta.env.PROD ? 8888 : 8887}/videos/${params.id}/${params.number.padStart(2, '0')}.mp4`}
      controls
      controlsList="nodownload"
      className={className}
    />
  )
}
