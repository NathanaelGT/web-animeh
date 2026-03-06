import { router } from '~/router'
import { videoPlayerStore } from './stores'

export const root = document.getElementById('root')!

export const miniplayerEl = document.getElementById('miniplayer')!

export const [miniplayerFullscreenButtonEl, miniplayerCloseButtonEl] =
  miniplayerEl.children as unknown as [HTMLButtonElement, HTMLButtonElement]

miniplayerFullscreenButtonEl.addEventListener('click', () => {
  videoEl.controls = false

  const videoPlayerState = videoPlayerStore.state

  if (videoPlayerState.id && videoPlayerState.ep) {
    router.navigate({
      to: '/anime/$id/episode/$number',
      params: {
        id: videoPlayerState.id,
        number: videoPlayerState.ep,
      },
    })
  }
})

export const videoEl = document.createElement('video')

videoEl.controls = true
videoEl.className = 'h-full w-full origin-top-left bg-primary-foreground'
videoEl.style.borderRadius = 'var(--radius-md)'
;(videoEl as { controlsList?: DOMTokenList }).controlsList?.add('nodownload')
