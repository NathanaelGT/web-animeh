import { useRouter } from '@tanstack/react-router'
import { useRef, useLayoutEffect } from 'react'
import {
  controlEl,
  miniplayerCloseButtonEl,
  miniplayerEl,
  miniplayerFullscreenButtonEl,
  playerEl,
  videoEl,
} from '~c/elements'
import { animeWatchSessionStore, episodeListStore, videoPlayerStore } from '~c/stores'
import { clientProfileSettingsStore } from '~c/stores'
import { rpc } from '~c/trpc'
import { createGlobalKeydownHandler } from '~c/utils/eventHandler'
import { createKeybindMatcher } from '~c/utils/keybind'
import { toggleMute, toggleFullscreen, togglePlayback } from '~c/videoPlayer/setup'
import { toast } from '@/ui/use-toast'
import { router } from '~/router'
import { searchEpisode } from '~/shared/utils/episode'
import { ucFirst } from '~/shared/utils/string'
import { formatTime, parseTime } from '~/shared/utils/time'
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

const isInWatchingPage = () => {
  return pathIdentifier() === '/anime/0/episode/0'
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

const getSearchParams = () => new URLSearchParams(location.search)

const storeVideoStateToSearchParams = (searchParams = getSearchParams()) => {
  if (!isInWatchingPage()) {
    const { id, ep } = videoPlayerStore.state

    if (id && ep) {
      searchParams.set('a', id)

      if (ep !== '1') {
        searchParams.set('e', ep)
      }
    }
  }

  const time = Math.round(videoEl.currentTime)
  if (time) {
    searchParams.set('t', formatTime(time))
  }

  const params = searchParams.toString().replaceAll('%3A', ':')

  router.history.replace(location.pathname + (params ? '?' + params : ''))

  return params
}

const removeVideoStateFromSearchParams = (searchParams = getSearchParams()) => {
  searchParams.delete('a')
  searchParams.delete('e')
  searchParams.delete('t')

  const params = searchParams.toString()

  router.history.replace(location.pathname + (params ? '?' + params : ''))
}

const changeEpisodeInMiniplayer = async (
  animeId: string,
  episodeTarget: number,
  episodeRef: { current: string },
) => {
  const isDownloaded = await rpc.anime.isEpisodeDownloaded.query({
    id: Number(animeId),
    ep: episodeTarget,
  })

  if (isDownloaded) {
    const episodeString = episodeTarget.toString()

    videoEl.src = getSrc(animeId, episodeString)
    videoEl.play()

    episodeRef.current = episodeString

    setPlayerState(animeId, episodeString)
  }
}

const setupVideoPlayer = (
  params: Props['params'],
  episodeRef: { current: string },
  changeEpisode: (episodeTarget: number) => void,
) => {
  episodeRef.current = params.number

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
      changeEpisode(Number(episodeRef.current) - 1)
    },
    next() {
      changeEpisode(Number(episodeRef.current) + 1)
    },
    mute: toggleMute,
    miniplayer() {
      if (lastPathIdentifier === pathIdentifier(router.latestLocation)) {
        forceUseMiniplayer = true

        router.navigate({
          to: '/anime/$id',
          params,
        })
      } else {
        router.navigate({
          to: '/anime/$id/episode/$number',
          params: {
            id: videoPlayerStore.state.id!.toString(),
            number: videoPlayerStore.state.ep!.toString(),
          },
        })
      }
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
    fullscreen: toggleFullscreen,
    playPause: togglePlayback,
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

  const fetchSkips = (id: number, ep: number) => {
    return rpc.episode.skips.query({ id, ep })
  }

  type Skips = Awaited<ReturnType<typeof fetchSkips>>

  let skips: Skips | null | undefined

  const skippedSkips = new Set<Skips[number]>()

  videoEl.onloadstart = async () => {
    videoEl.ontimeupdate = null
    skips = null

    const { src } = videoEl
    const slashLastIndex = src.lastIndexOf('/')

    const animeId = parseInt(src.slice(src.lastIndexOf('/', slashLastIndex - 1) + 1))
    const episodeNumber = parseInt(src.slice(slashLastIndex + 1))

    skips = await fetchSkips(animeId, episodeNumber)

    if (skips.length) {
      const setupSkipper = () => {
        const duration = videoEl.duration

        const normalizedSkips = skips?.filter(skip => Math.abs(duration - skip.episodeLength) < 60)
        if (!normalizedSkips?.length) {
          videoEl.ontimeupdate = null

          return
        }

        videoEl.currentTime = duration - normalizedSkips[0]!.episodeLength

        videoEl.ontimeupdate = () => {
          if (!skips?.length) {
            videoEl.ontimeupdate = null

            return
          }

          const time = videoEl.currentTime

          for (const skip of skips) {
            if (skippedSkips.has(skip)) {
              continue
            }

            const durationDiff = duration - skip.episodeLength

            if (time >= skip.startTime + durationDiff && time < skip.endTime + durationDiff) {
              videoEl.currentTime = skip.endTime

              if (skippedSkips.size === skips.length - 1) {
                videoEl.ontimeupdate = null
              } else {
                skippedSkips.add(skip)
              }
            }
          }
        }
      }

      if (isNaN(videoEl.duration)) {
        videoEl.oncanplay = () => {
          videoEl.oncanplay = null
          setupSkipper()
        }
      } else {
        setupSkipper()
      }
    }
  }

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
        playerEl.remove()
        videoEl.removeAttribute('src')
      })
    }

    removeKeybindHandler()

    setPlayerState(null, null)
  }
}

const setPlayerState = (id: string | null, ep: string | null) => {
  videoPlayerStore.setState(state => ({
    id,
    ep,
    session: state.session,
  }))
}

export function VideoPlayer({ streamingUrl, params }: Props) {
  const router = useRouter()
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

        const playerBounding = playerEl.getBoundingClientRect()

        const animationProgress =
          1 -
          (playerBounding.width - miniplayerBounding.width) /
            (containerBounding.width - miniplayerBounding.width)

        const deltaX = containerBounding.left - miniplayerBounding.left
        const deltaY = containerBounding.top - miniplayerBounding.top
        const deltaS = containerBounding.width / miniplayerBounding.width

        controlEl.classList.add('hidden')
        playerEl.style.transition = videoTransition(animationProgress)
        playerEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaS})`
        playerEl.style.borderRadius = '0'
        playerEl.style.boxShadow = '0'

        playerEl.ontransitionend = function onTransitionEnd() {
          // ada race condition transitionend dipanggil padahal masih ditengah-tengah animasi
          // jadi buat ngakalinnya dicek dulu widthnya, kalo belum sama dengan container berarti masih dalam proses animasi
          const videoBounding = playerEl.getBoundingClientRect()
          if (videoBounding.width !== containerBounding.width) {
            playerEl.ontransitionend = onTransitionEnd

            return
          }

          playerEl.ontransitionend = null

          playerEl.style.transition = ''
          playerEl.style.transform = ''
          container.append(playerEl)
          controlEl.classList.remove('hidden')
          miniplayerEl.classList.add('hidden')
        }
      } else {
        videoEl.onended = null
        container.append(playerEl)
        miniplayerEl.classList.add('hidden')
      }
    } else {
      container.append(playerEl)
    }

    const changeEpisode = (episodeTarget: number) => {
      if (miniplayerEl.contains(playerEl)) {
        changeEpisodeInMiniplayer(params.id, episodeTarget, gotoEpisodeRef)

        return
      }

      const episode = searchEpisode(episodeListStore.state, episodeTarget)
      if (!episode) {
        return false
      }

      const episodeString = episodeTarget.toString()

      if (episode.download.status === 'DOWNLOADED' && document.fullscreenElement === playerEl) {
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

    forceUseMiniplayer = false

    if (videoPlayerStore.state.id !== params.id || videoPlayerStore.state.ep !== params.number) {
      setPlayerState(null, null)

      const src = streamingUrl || getSrc(params.id, params.number)
      const autoplay = () => {
        videoEl.src = src

        const { backupStateMode } = clientProfileSettingsStore.state.videoPlayer
        if (backupStateMode !== 'Disable') {
          const searchParams = getSearchParamsFromSession() || getSearchParams()
          const time = searchParams.get('t')
          if (time) {
            videoEl.currentTime = parseTime(time)

            if (backupStateMode === 'Smart') {
              removeVideoStateFromSearchParams(searchParams)
            }

            if (videoEl.currentTime) {
              return
            }
          }
        }

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

      setupVideoPlayer(params, gotoEpisodeRef, changeEpisode)
    }

    const videoFullscreenChangeHandler = () => {
      // kalo user mencet tombol fullscreen, focusnya bakal pindah ke tombolnya
      // tapi karena tombolnya bagian dari shadow dom, jadi document.activeElement = video
      // pada saat focusnya adalah tombol fullscreen, kalo user mencet spasi,
      // bakal keoverride jadi toggle fullscreen
      if (document.activeElement === videoEl) {
        videoEl.focus()
      }

      if (gotoEpisodeRef.current === params.number || document.fullscreenElement === playerEl) {
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

    playerEl.addEventListener('fullscreenchange', videoFullscreenChangeHandler)
    videoEl.addEventListener('error', errorHandler)
    videoEl.addEventListener('ended', videoEndedHandler)

    return () => {
      playerEl.removeEventListener('fullscreenchange', videoFullscreenChangeHandler)
      videoEl.removeEventListener('error', errorHandler)
      videoEl.removeEventListener('ended', videoEndedHandler)
      videoEl.onloadeddata = null

      clearTimeout(errorTimeoutId)

      if (!forceUseMiniplayer) {
        if (clientProfileSettingsStore.state.videoPlayer.miniplayerMode === 'No Auto') {
          setPlayerState(null, null)
          removeKeybindHandler()
          playerEl.remove()
          videoEl.removeAttribute('src')

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

      const playerBounding = videoEl.getBoundingClientRect()

      miniplayerEl.ontransitionend = null
      miniplayerEl.classList.remove('hidden')
      miniplayerEl.style.opacity = '1'
      miniplayerEl.prepend(playerEl)

      const miniplayerStyle = getComputedStyle(miniplayerEl)
      const miniplayerWidth = parseInt(miniplayerStyle.width)
      const miniplayerLeft = innerWidth - miniplayerWidth - parseInt(miniplayerStyle.right)
      const miniplayerTop =
        innerHeight - parseInt(miniplayerStyle.height) - parseInt(miniplayerStyle.bottom)

      const deltaX = playerBounding.left - miniplayerLeft
      const deltaY = playerBounding.top - miniplayerTop
      const deltaS = playerBounding.width / miniplayerWidth

      controlEl.classList.add('hidden')
      playerEl.style.transition = ''
      playerEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaS})`

      requestAnimationFrame(() => {
        const videoBounding = playerEl.getBoundingClientRect()

        const animationProgress = videoBounding.width / containerBounding.width

        playerEl.style.transition = videoTransition(animationProgress)
        playerEl.style.transform = 'translate(0, 0) scale(1)'
        playerEl.style.borderRadius = 'var(--radius-md)'
        playerEl.style.boxShadow = 'var(--shadow-md)'

        playerEl.ontransitionend = () => {
          playerEl.ontransitionend = null

          controlEl.classList.remove('hidden')
          playerEl.style.transition = ''
          playerEl.style.transform = ''

          miniplayerFullscreenButtonEl.style.opacity = '1'
          miniplayerCloseButtonEl.style.opacity = '1'
        }
      })
    }
  }, [streamingUrl, params.id, params.number])

  return <div ref={containerRef} className="h-full w-full rounded-md" />
}

clientProfileSettingsStore.subscribe(() => {
  const set = ({
    onpause,
    onplay,
    onvisibilitychange,
    onbeforeunload,
  }: Partial<
    Pick<typeof videoEl, 'onpause' | 'onplay'> &
      Pick<typeof document, 'onvisibilitychange'> &
      Pick<typeof window, 'onbeforeunload'>
  >) => {
    videoEl.onpause = onpause || null
    videoEl.onplay = onplay || null
    document.onvisibilitychange = onvisibilitychange || null
    window.onbeforeunload = onbeforeunload || null
  }

  const { backupStateMode } = clientProfileSettingsStore.state.videoPlayer

  if (backupStateMode === 'Disable') {
    set({})
  } else if (backupStateMode === 'On Pause') {
    set({
      onpause() {
        storeVideoStateToSearchParams()
      },

      onplay() {
        removeVideoStateFromSearchParams()
      },
    })
  } else if (backupStateMode === 'Smart') {
    set({
      onvisibilitychange() {
        if (!document.body.contains(playerEl) || !videoEl.paused) {
          return
        }

        const searchParams = getSearchParams()
        if (document.hidden) {
          storeVideoStateToSearchParams(searchParams)
        } else if (searchParams.has('t')) {
          removeVideoStateFromSearchParams(searchParams)
        }
      },

      onbeforeunload() {
        if (document.body.contains(playerEl)) {
          const searchParams = storeVideoStateToSearchParams()

          sessionStorage.setItem('videoPlayerState', Date.now() + '|' + searchParams)
        }
      },
    })
  }
})

const getFromSessionStorage = (key: string) => {
  const state = sessionStorage.getItem(key)
  if (!state) {
    return
  }

  sessionStorage.removeItem(key)

  const [timestampRaw, value] = state.split('|') as [string, string]
  const timestamp = parseInt(timestampRaw)

  // dengan spek cpu modern, selisihnya cuma 1ms
  if (isFinite(timestamp) && timestamp + performance.now() - Date.now() > 50) {
    return
  }

  return value
}

// yang dari URL ga selalu bisa diandalkan. Kalo user refresh tab,
// browser bakal ngambil snapshot url sebelum direfresh, jadinya state yang di URL bakal diabaikan
const getSearchParamsFromSession = () => {
  const params = getFromSessionStorage('videoPlayerEpisode')
  if (params) {
    return new URLSearchParams(params)
  }
}

requestAnimationFrame(() => {
  if (isInWatchingPage()) {
    return
  }

  const getSearchParamsFromUrl = () => {
    const searchParams = getSearchParams()

    if (searchParams.has('a')) {
      removeVideoStateFromSearchParams()
    }

    return searchParams
  }

  const searchParams = getSearchParamsFromSession() ?? getSearchParamsFromUrl()
  const id = searchParams.get('a')
  if (!id) {
    return
  }

  const ep = searchParams.get('e') || '1'

  videoPlayerStore.setState(() => ({
    id,
    ep,
    session: Math.random().toString().slice(2),
  }))

  videoEl.src = getSrc(id, ep)

  videoEl.onended = () => {
    videoEl.onended = null
    miniplayerCloseButtonEl.click()
  }

  const time = searchParams.get('t')
  if (time) {
    videoEl.currentTime = parseTime(time)
  }

  miniplayerEl.classList.remove('hidden')
  miniplayerEl.style.opacity = '1'
  miniplayerEl.prepend(playerEl)

  miniplayerFullscreenButtonEl.style.opacity = '1'
  miniplayerCloseButtonEl.style.opacity = '1'

  const episodeRef = { current: ep }

  setupVideoPlayer({ id, number: ep }, episodeRef, episodeTarget => {
    changeEpisodeInMiniplayer(id, episodeTarget, episodeRef)
  })
})

if (isInWatchingPage()) {
  const urlEpisode = getFromSessionStorage('videoPlayerEpisode')

  if (urlEpisode) {
    history.replaceState(history.state, '', location.pathname.replace(/\d+$/, urlEpisode))
  }
}

window.addEventListener('beforeunload', () => {
  if (isInWatchingPage() && document.fullscreenElement === playerEl) {
    const { pathname } = location
    const { src } = videoEl

    const urlEpisode = parseInt(pathname.slice(pathname.lastIndexOf('/') + 1))
    const videoEpisode = parseInt(src.slice(src.lastIndexOf('/') + 1))

    if (urlEpisode !== videoEpisode) {
      sessionStorage.setItem('videoPlayerEpisode', Date.now() + '|' + videoEpisode)
    }
  }
})
