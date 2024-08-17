import { useRef, useEffect, useContext } from 'react'
import { useRouter } from '@tanstack/react-router'
import { episodeListStore } from '~c/stores'
import { AnimeWatchSessionContext } from '~c/context'
import { searchEpisode } from '~/shared/utils/episode'

type Props = {
  params: {
    id: string
    number: string
  }
}

const getSrc = (animeId: string, episodeString: string) => {
  const PORT = import.meta.env.PROD ? 8888 : 8887

  return `http://localhost:${PORT}/videos/${animeId}/${episodeString.padStart(2, '0')}.mp4`
}

export function VideoPlayer({ params }: Props) {
  const router = useRouter()
  const watchSession = useContext(AnimeWatchSessionContext)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gotoEpisodeRef = useRef(params.number)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const video = document.querySelector<HTMLVideoElement>('video#player')
    if (!video) {
      return
    }

    const src = getSrc(params.id, params.number)
    if (video.dataset.id === watchSession.id) {
      if (video.src !== src) {
        video.src = src
      }
    } else {
      video.dataset.id = watchSession.id
      video.src = src
    }

    container.appendChild(video)

    video.muted = true
    video.play().then(() => {
      video.muted = false
    })

    const keybindHandler = (event: KeyboardEvent) => {
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

          const episodeString = episodeTarget.toString()

          if (document.fullscreenElement === video) {
            video.src = getSrc(params.id, episodeString)
            video.play()

            gotoEpisodeRef.current = episodeString
          } else {
            router.navigate({
              to: '/anime/$id/episode/$number',
              params: {
                id: params.id,
                number: episodeString,
              },
            })
          }
        }

        const handler = {
          p() {
            changeEpisode(Number(gotoEpisodeRef.current) - 1)
          },

          n() {
            changeEpisode(Number(gotoEpisodeRef.current) + 1)
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

    video.onfullscreenchange = () => {
      if (gotoEpisodeRef.current === params.number || document.fullscreenElement === video) {
        return
      }

      router.navigate({
        to: '/anime/$id/episode/$number',
        params: {
          id: params.id,
          number: gotoEpisodeRef.current,
        },
      })
    }

    window.addEventListener('keydown', keybindHandler)

    return () => {
      video.pause()
      document.getElementById('void')?.appendChild(video)

      window.removeEventListener('keydown', keybindHandler)
    }
  }, [])

  return <div ref={containerRef} />
}