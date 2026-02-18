import { useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { animeWatchSessionStore, episodeListStore } from '~c/stores'
import { clientProfileSettingsStore } from '~c/stores'
import { createKeybindMatcher } from '~c/utils/keybind'
import { createGlobalKeydownHandler } from '~c/utils/eventHandler'
import { searchEpisode } from '~/shared/utils/episode'
import { ucFirst } from '~/shared/utils/string'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']

type Props = {
  streamingUrl: string | undefined
  params: {
    id: string
    number: string
  }
  onLoad?: () => void | boolean
  className?: string
}

const getSrc = (animeId: string, episodeString: string) => {
  const basePath = import.meta.env.PROD ? origin : 'http://localhost:8887'

  return `${basePath}/videos/${animeId}/${episodeString.padStart(2, '0')}.mp4`
}

const video = document.querySelector<HTMLVideoElement>('video#player')!

export function VideoPlayer({ streamingUrl, params, onLoad, className = 'h-full w-full' }: Props) {
  const router = useRouter()
  const watchSession = useStore(animeWatchSessionStore)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gotoEpisodeRef = useRef(params.number)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const autoplay = () => {
      video.addEventListener(
        'loadeddata',
        () => {
          onLoad?.()

          const play = () => {
            video.muted = true
            video.play().then(() => {
              video.muted = false
            })
          }

          if (document.hidden) {
            document.addEventListener('visibilitychange', play, { once: true })
          } else {
            play()
          }
        },
        { once: true },
      )
    }

    const src = streamingUrl || getSrc(params.id, params.number)
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

      if (
        (episode.download.status === 'DOWNLOADED' || streamingUrl) &&
        document.fullscreenElement === video
      ) {
        video.src = streamingUrl || getSrc(params.id, episodeString)
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

    const setting = clientProfileSettingsStore.state
    const getJumpTime = (variant: '' | 'long' = '') => {
      // @ts-ignore
      const time = setting.videoPlayer[(variant ? variant + 'J' : 'j') + 'umpSec'] as number

      // @ts-ignore
      const isRelative = setting.videoPlayer[`relative${ucFirst(variant)}Jump`] as boolean

      return isRelative ? time * video.playbackRate : time
    }

    const keybindHandler: Record<string, () => void> = {
      back() {
        video.currentTime -= getJumpTime()
      },
      forward() {
        video.currentTime += getJumpTime()
      },
      longBack() {
        video.currentTime -= getJumpTime('long')
      },
      longForward() {
        video.currentTime += getJumpTime('long')
      },
      volumeUp() {
        video.volume = Math.min(1, video.volume + setting.videoPlayer.volumeStep)
      },
      volumeDown() {
        video.volume = Math.max(0, video.volume - setting.videoPlayer.volumeStep)
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
      const keybindMatch = createKeybindMatcher(event)

      for (const handlerName in keybindHandler) {
        const combination =
          setting.keybind.videoPlayer[handlerName as keyof KeybindGroups['videoPlayer']]

        if (!keybindMatch(combination)) {
          continue
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

    let errorRetryCount = 0
    let errorTimeoutId: NodeJS.Timeout
    const errorHandler = () => {
      // 16 percobaan pertama tiap 0.5 detik
      // diatas itu tiap percobaan nambah 0.5 detik, maks 30 detik
      const ms = Math.min(Math.max(errorRetryCount++ - 15, 1) * 500, 30000)

      errorTimeoutId = setTimeout(() => {
        const time = video.currentTime

        video.onloadeddata = () => {
          video.currentTime = time
        }

        video.load()
      }, ms)
    }

    video.addEventListener('ended', videoEndedHandler)
    video.addEventListener('fullscreenchange', videoFullscreenChangeHandler)
    video.addEventListener('error', errorHandler)

    return () => {
      const voidEl = document.getElementById('void')

      voidEl?.appendChild(video)

      video.removeEventListener('ended', videoEndedHandler)
      video.removeEventListener('fullscreenchange', videoFullscreenChangeHandler)
      video.removeEventListener('error', errorHandler)
      video.onloadeddata = null

      clearTimeout(errorTimeoutId)

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
  }, [streamingUrl])

  return <div ref={containerRef} className={className} />
}
