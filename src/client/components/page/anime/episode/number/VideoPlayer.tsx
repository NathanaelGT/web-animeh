import { useRouter } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { useRef, useEffect } from 'react'
import { animeWatchSessionStore, episodeListStore } from '~c/stores'
import { clientProfileSettingsStore } from '~c/stores'
import { createGlobalKeydownHandler } from '~c/utils/eventHandler'
import { createKeybindMatcher } from '~c/utils/keybind'
import { useToast } from '@/ui/use-toast'
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
}

export const getSrc = (animeId: string, episodeString: string) => {
  const basePath = import.meta.env.PROD ? origin : 'http://localhost:8887'

  return `${basePath}/videos/${animeId}/${episodeString.padStart(2, '0')}.mp4`
}

const video = document.querySelector<HTMLVideoElement>('video#player')!

export function VideoPlayer({ streamingUrl, params }: Props) {
  const router = useRouter()
  const { toast } = useToast()
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
      const prefix = variant ? (`${variant}J` as const) : 'j'

      const time = setting.videoPlayer[`${prefix}umpSec`]

      const isRelative = setting.videoPlayer[`relative${ucFirst(variant)}Jump`]

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
        if (!video.requestPictureInPicture) {
          toast({
            title: 'Picture-in-Picture tidak didukung di browser ini',
          })

          return
        }

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
      // 3 percobaan pertama tiap 0.5 detik
      // diatas itu tiap percobaan nambah 0.5 detik, maks 30 detik
      const ms = Math.min(Math.max(errorRetryCount++ - 2, 1) * 500, 30000)

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

  return <div ref={containerRef} className="h-full w-full" />
}
