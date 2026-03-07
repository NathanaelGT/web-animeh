import { useRouter } from '@tanstack/react-router'
import { useRef, useLayoutEffect } from 'react'
import {
  miniplayerCloseButtonEl,
  miniplayerEl,
  miniplayerFullscreenButtonEl,
  videoEl,
} from '~c/elements'
import { animeWatchSessionStore, episodeListStore, videoPlayerStore } from '~c/stores'
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

const pathIdentifier = (loc: { pathname: string } = location) => {
  return loc.pathname.replace(/\d+/g, '0')
}

let removeKeybindHandler = () => {}

let forceUseMiniplayer = false

let lastPathIdentifier = ''

const TRANSITION_TIMING = 'ease-in-out'

const getMiniplayerAnimationDuration = () => {
  // kalo 0, ontransitionend gabakal dicall kalo disetnya setelah requestAnimationFrame
  // jadi dilimit minnya 0, secara hasil 1ms gabakal keliatan animasinya
  return clientProfileSettingsStore.state.videoPlayer.miniplayerAnimationDuration || 1
}

const videoTransition = (percent: number) => {
  const suffix = getMiniplayerAnimationDuration() * percent + 'ms ' + TRANSITION_TIMING

  return `transform ${suffix}, border-radius ${suffix}, box-shadow ${suffix}`
}

export function VideoPlayer({ streamingUrl, params }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gotoEpisodeRef = useRef(params.number)

  let skipEffectDoubleCall = import.meta.env.DEV

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    if (import.meta.env.DEV && skipEffectDoubleCall) {
      skipEffectDoubleCall = false
      return
    }

    const containerBounding = container.getBoundingClientRect()

    if (forceUseMiniplayer || lastPathIdentifier !== pathIdentifier()) {
      lastPathIdentifier = pathIdentifier()

      const miniplayerBounding = miniplayerEl.getBoundingClientRect()
      if (miniplayerBounding.width) {
        miniplayerFullscreenButtonEl.style.opacity = '0'
        miniplayerCloseButtonEl.style.opacity = '0'

        const videoBounding = videoEl.getBoundingClientRect()

        const animationProgress =
          1 -
          (videoBounding.width - miniplayerBounding.width) /
            (containerBounding.width - miniplayerBounding.width)

        const deltaX = containerBounding.left - miniplayerBounding.left
        const deltaY = containerBounding.top - miniplayerBounding.top
        const deltaS = containerBounding.width / miniplayerBounding.width

        videoEl.controls = false
        videoEl.style.transition = videoTransition(animationProgress)
        videoEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaS})`
        videoEl.style.borderRadius = '0'
        videoEl.style.boxShadow = '0'

        videoEl.ontransitionend = function onTransitionEnd() {
          // ada race condition transitionend dipanggil padahal masih ditengah-tengah animasi
          // jadi buat ngakalinnya dicek dulu widthnya, kalo belum sama dengan container berarti masih dalam proses animasi
          const videoBounding = videoEl.getBoundingClientRect()
          if (videoBounding.width !== containerBounding.width) {
            videoEl.ontransitionend = onTransitionEnd

            return
          }

          videoEl.ontransitionend = null

          videoEl.controls = true
          videoEl.style.transition = ''
          videoEl.style.transform = ''
          container.appendChild(videoEl)
          miniplayerEl.classList.add('hidden')
        }
      } else {
        videoEl.onended = null
        container.appendChild(videoEl)
        miniplayerEl.classList.add('hidden')
      }
    } else {
      container.appendChild(videoEl)
    }

    const changeEpisode = (episodeTarget: number) => {
      const episode = searchEpisode(episodeListStore.state, episodeTarget)
      if (!episode) {
        return false
      }

      const episodeString = episodeTarget.toString()

      if (episode.download.status === 'DOWNLOADED' && document.fullscreenElement === videoEl) {
        videoEl.src = getSrc(params.id, episodeString)
        videoEl.play()

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

      return true
    }

    const setPlayerState = (id: string | null, ep: string | null) => {
      videoPlayerStore.setState(state => ({
        id,
        ep,
        session: state.session,
      }))
    }

    forceUseMiniplayer = false

    if (videoPlayerStore.state.id !== params.id || videoPlayerStore.state.ep !== params.number) {
      setPlayerState(null, null)

      const src = streamingUrl || getSrc(params.id, params.number)
      const autoplay = () => {
        videoEl.src = src
        videoEl.addEventListener(
          'loadeddata',
          () => {
            const play = () => {
              videoEl.muted = true
              videoEl.play().then(() => {
                videoEl.muted = false
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

      if (videoPlayerStore.state.session === animeWatchSessionStore.state.id) {
        if (videoEl.src !== src) {
          autoplay()
        }
      } else {
        videoPlayerStore.state.session = animeWatchSessionStore.state.id
        autoplay()
      }

      const getJumpTime = (variant: '' | 'long' = '') => {
        const prefix = variant ? (`${variant}J` as const) : 'j'

        const time = clientProfileSettingsStore.state.videoPlayer[`${prefix}umpSec`]

        const isRelative =
          clientProfileSettingsStore.state.videoPlayer[`relative${ucFirst(variant)}Jump`]

        return isRelative ? time * videoEl.playbackRate : time
      }

      const keybindHandler = {
        back() {
          videoEl.currentTime -= getJumpTime()
        },
        forward() {
          videoEl.currentTime += getJumpTime()
        },
        longBack() {
          videoEl.currentTime -= getJumpTime('long')
        },
        longForward() {
          videoEl.currentTime += getJumpTime('long')
        },
        volumeUp() {
          videoEl.volume = Math.min(
            1,
            videoEl.volume + clientProfileSettingsStore.state.videoPlayer.volumeStep,
          )
        },
        volumeDown() {
          videoEl.volume = Math.max(
            0,
            videoEl.volume - clientProfileSettingsStore.state.videoPlayer.volumeStep,
          )
        },
        toStart() {
          videoEl.currentTime = 0
        },
        toEnd() {
          videoEl.currentTime = videoEl.duration
        },
        previous() {
          changeEpisode(Number(gotoEpisodeRef.current) - 1)
        },
        next() {
          changeEpisode(Number(gotoEpisodeRef.current) + 1)
        },
        mute() {
          videoEl.muted = !videoEl.muted
        },
        miniplayer() {
          forceUseMiniplayer = true

          router.navigate({
            to:
              lastPathIdentifier === pathIdentifier(router.latestLocation)
                ? '/anime/$id'
                : '/anime/$id/episode/$number',
            params,
          })
        },
        PiP() {
          if (!videoEl.requestPictureInPicture) {
            toast({
              title: 'Picture-in-Picture tidak didukung di browser ini',
            })

            return
          }

          if (document.pictureInPictureElement === videoEl) {
            document.exitPictureInPicture()
          } else {
            videoEl.requestPictureInPicture()
          }
        },
        fullscreen() {
          if (document.fullscreenElement === videoEl) {
            document.exitFullscreen()
          } else {
            videoEl.requestFullscreen()
          }
        },
        playPause() {
          if (videoEl.paused || videoEl.ended) {
            videoEl.play()
          } else {
            videoEl.pause()
          }
        },
      } satisfies Partial<Record<keyof KeybindGroups['videoPlayer'], () => void>>

      removeKeybindHandler = createGlobalKeydownHandler(event => {
        const keybindMatch = createKeybindMatcher(event)

        let handlerName: keyof KeybindGroups['videoPlayer']
        for (handlerName in keybindHandler) {
          const combination = clientProfileSettingsStore.state.keybind.videoPlayer[handlerName]

          if (keybindMatch(combination)) {
            event.preventDefault()

            keybindHandler[handlerName]()

            return
          }
        }
      })

      miniplayerCloseButtonEl.onclick = () => {
        miniplayerCloseButtonEl.onclick = null

        miniplayerEl.style.transition = `opacity ${getMiniplayerAnimationDuration()}ms ${TRANSITION_TIMING}`
        miniplayerEl.style.opacity = '0'
        miniplayerEl.ontransitionend = () => {
          miniplayerEl.ontransitionend = null

          miniplayerEl.style.transition = ''
          miniplayerEl.classList.add('hidden')

          requestAnimationFrame(() => {
            // remove bakal otomatis ngeluarin dari PiP
            videoEl.remove()
            videoEl.src = ''
          })
        }

        removeKeybindHandler()

        setPlayerState(null, null)
      }
    }

    const videoFullscreenChangeHandler = () => {
      // kalo user mencet tombol fullscreen, focusnya bakal pindah ke tombolnya
      // tapi karena tombolnya bagian dari shadow dom, jadi document.activeElement = video
      // pada saat focusnya adalah tombol fullscreen, kalo user mencet spasi,
      // bakal keoverride jadi toggle fullscreen
      if (document.activeElement === videoEl) {
        videoEl.focus()
      }

      if (gotoEpisodeRef.current === params.number || document.fullscreenElement === videoEl) {
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
        const time = videoEl.currentTime

        videoEl.onloadeddata = () => {
          videoEl.currentTime = time
        }

        videoEl.load()
      }, ms)
    }

    let shouldPlayInMiniplayer = true
    const videoEndedHandler = () => {
      const episodeFound = changeEpisode(Number(gotoEpisodeRef.current) + 1)

      if (!episodeFound) {
        shouldPlayInMiniplayer = false
      }
    }

    videoEl.addEventListener('fullscreenchange', videoFullscreenChangeHandler)
    videoEl.addEventListener('error', errorHandler)
    videoEl.addEventListener('ended', videoEndedHandler)

    return () => {
      videoEl.removeEventListener('fullscreenchange', videoFullscreenChangeHandler)
      videoEl.removeEventListener('error', errorHandler)
      videoEl.removeEventListener('ended', videoEndedHandler)
      videoEl.onloadeddata = null

      clearTimeout(errorTimeoutId)

      if (!forceUseMiniplayer) {
        if (clientProfileSettingsStore.state.videoPlayer.miniplayerMode === 'No Auto') {
          setPlayerState(null, null)
          removeKeybindHandler()
          videoEl.remove()
          videoEl.src = ''

          return
        }

        // masih di halamanan episode, cuma pindah episode
        if (lastPathIdentifier === pathIdentifier()) {
          removeKeybindHandler()

          return
        }
        lastPathIdentifier = ''
      }

      if (
        !forceUseMiniplayer &&
        !(
          shouldPlayInMiniplayer &&
          (clientProfileSettingsStore.state.videoPlayer.miniplayerMode === 'Selalu' ||
            (!videoEl.paused &&
              // 7% + op, untuk anime 24 menit = ~3 menit
              videoEl.currentTime > (videoEl.duration / 100) * 7 + 90 &&
              // 5 menit terakhir
              videoEl.currentTime < videoEl.duration - 300))
        )
      ) {
        miniplayerCloseButtonEl.click()

        return
      }

      setPlayerState(params.id, params.number)

      videoEl.onended = () => {
        videoEl.onended = null
        miniplayerCloseButtonEl.click()
      }

      const videoBounding = videoEl.getBoundingClientRect()

      miniplayerEl.ontransitionend = null
      miniplayerEl.classList.remove('hidden')
      miniplayerEl.style.opacity = '1'
      miniplayerEl.prepend(videoEl)

      const miniplayerStyle = getComputedStyle(miniplayerEl)
      const miniplayerWidth = parseInt(miniplayerStyle.width)
      const miniplayerLeft = innerWidth - miniplayerWidth - parseInt(miniplayerStyle.right)
      const miniplayerTop =
        innerHeight - parseInt(miniplayerStyle.height) - parseInt(miniplayerStyle.bottom)

      const deltaX = videoBounding.left - miniplayerLeft
      const deltaY = videoBounding.top - miniplayerTop
      const deltaS = videoBounding.width / miniplayerWidth

      videoEl.controls = false
      videoEl.style.transition = ''
      videoEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaS})`

      requestAnimationFrame(() => {
        const videoBounding = videoEl.getBoundingClientRect()

        const animationProgress = videoBounding.width / containerBounding.width

        videoEl.style.transition = videoTransition(animationProgress)
        videoEl.style.transform = 'translate(0, 0) scale(1)'
        videoEl.style.borderRadius = 'var(--radius-md)'
        videoEl.style.boxShadow = 'var(--shadow-md)'

        videoEl.ontransitionend = () => {
          videoEl.ontransitionend = null

          videoEl.controls = true
          videoEl.style.transition = ''
          videoEl.style.transform = ''

          miniplayerFullscreenButtonEl.style.opacity = '1'
          miniplayerCloseButtonEl.style.opacity = '1'
        }
      })
    }
  }, [streamingUrl, params.id, params.number])

  return <div ref={containerRef} className="h-full w-full rounded-md" />
}
