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
          ArrowLeft() {
            video.currentTime -= 5
          },

          ArrowRight() {
            video.currentTime += 5
          },

          ArrowUp() {
            video.volume = Math.min(1, video.volume + 0.05)
          },

          ArrowDown() {
            video.volume = Math.max(0, video.volume - 0.05)
          },

          Home() {
            video.currentTime = 0
          },

          End() {
            video.currentTime = video.duration
          },

          p() {
            changeEpisode(Number(gotoEpisodeRef.current) - 1)
          },

          n() {
            changeEpisode(Number(gotoEpisodeRef.current) + 1)
          },

          m() {
            video.muted = !video.muted
          },

          i() {
            if (document.pictureInPictureElement === video) {
              document.exitPictureInPicture()
            } else {
              video.requestPictureInPicture()
            }
          },

          f() {
            if (document.fullscreenElement === video) {
              document.exitFullscreen()
            } else {
              video.requestFullscreen()
            }
          },

          [' ']() {
            if (video.paused || video.ended) {
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
      const voidEl = document.getElementById('void')

      video.pause()
      voidEl?.appendChild(video)

      window.removeEventListener('keydown', keybindHandler)

      if (document.pictureInPictureElement === video) {
        setTimeout(() => {
          if (voidEl?.contains(video)) {
            document.exitPictureInPicture()
          }
        })
      }
    }
  }, [])

  return <div ref={containerRef} />
}
