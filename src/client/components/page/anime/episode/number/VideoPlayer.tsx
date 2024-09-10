import { useRef, useEffect, useContext } from 'react'
import { useRouter } from '@tanstack/react-router'
import { episodeListStore } from '~c/stores'
import { AnimeWatchSessionContext } from '~c/context'
import { clientProfileSettingsStore } from '~c/stores'
import { captureKeybindFromEvent } from '~c/utils/keybind'
import { createGlobalKeydownHandler } from '~c/utils/eventHandler'
import { searchEpisode } from '~/shared/utils/episode'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']

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

    const autoplay = () => {
      video.addEventListener(
        'loadeddata',
        () => {
          video.muted = true
          video.play().then(() => {
            video.muted = false
          })
        },
        { once: true },
      )
    }

    const src = getSrc(params.id, params.number)
    if (video.dataset.id === watchSession.id) {
      if (video.src !== src) {
        video.src = src
        autoplay()
      }
    } else {
      video.dataset.id = watchSession.id
      video.src = src
      autoplay()
    }

    container.appendChild(video)

    const changeEpisode = (episodeTarget: number) => {
      const episode = searchEpisode(episodeListStore.state, episodeTarget)
      if (!episode) {
        return
      }

      const episodeString = episodeTarget.toString()

      // downloadStatus typenya boolean|string
      if (episode.downloadStatus === true && document.fullscreenElement === video) {
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

    const keybindHandler: Record<string, () => void> = {
      back() {
        video.currentTime -= 5
      },
      forward() {
        video.currentTime += 5
      },
      longBack() {
        video.currentTime -= 87
      },
      longForward() {
        video.currentTime += 87
      },
      volumeUp() {
        video.volume = Math.min(1, video.volume + 0.05)
      },
      volumeDown() {
        video.volume = Math.max(0, video.volume - 0.05)
      },
      toStart() {
        video.currentTime = 0
      },
      toEnd() {
        video.currentTime = video.duration
      },
      previous() {
        changeEpisode(Number(gotoEpisodeRef.current) - 1)
      },
      next() {
        changeEpisode(Number(gotoEpisodeRef.current) + 1)
      },
      mute() {
        video.muted = !video.muted
      },
      PiP() {
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture()
        } else {
          video.requestPictureInPicture()
        }
      },
      fullscreen() {
        if (document.fullscreenElement === video) {
          document.exitFullscreen()
        } else {
          video.requestFullscreen()
        }
      },
      playPause() {
        if (video.paused || video.ended) {
          video.play()
        } else {
          video.pause()
        }
      },
    } satisfies Partial<Record<keyof KeybindGroups['videoPlayer'], () => void>>

    const removeKeybindHandler = createGlobalKeydownHandler(event => {
      const capturedCombination = captureKeybindFromEvent(event)

      outer: for (const handlerName in keybindHandler) {
        const combination =
          clientProfileSettingsStore.state.keybind.videoPlayer[
            handlerName as keyof KeybindGroups['videoPlayer']
          ]

        for (let i = 0; i < combination.length; i++) {
          if (combination[i] !== capturedCombination[i]) {
            continue outer
          }
        }

        event.preventDefault()

        keybindHandler[handlerName]!()

        return
      }
    })

    const videoEndedHandler = () => {
      changeEpisode(Number(gotoEpisodeRef.current) + 1)
    }

    const videoFullscreenChangeHandler = () => {
      // kalo user mencet tombol fullscreen, focusnya bakal pindah ke tombolnya
      // tapi karena tombolnya bagian dari shadow dom, jadi document.activeElement = video
      // pada saat focusnya adalah tombol fullscreen, kalo user mencet spasi,
      // bakal keoverride jadi toggle fullscreen
      if (document.activeElement === video) {
        video.focus()
      }

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

    video.addEventListener('ended', videoEndedHandler)
    video.addEventListener('fullscreenchange', videoFullscreenChangeHandler)

    return () => {
      const voidEl = document.getElementById('void')

      voidEl?.appendChild(video)

      video.removeEventListener('ended', videoEndedHandler)
      video.removeEventListener('fullscreenchange', videoFullscreenChangeHandler)

      removeKeybindHandler()

      setTimeout(() => {
        if (voidEl?.contains(video)) {
          video.src = ''

          if (document.pictureInPictureElement === video) {
            document.exitPictureInPicture()
          }
        }
      })
    }
  }, [])

  return <div ref={containerRef} />
}
