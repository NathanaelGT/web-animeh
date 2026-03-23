import { videoEl, iconsEl, overlayEl } from '~c/elements'
import { toggleFullscreen } from './setup-fullscreen'
import { tooltip } from './setup-module'
import { playbackInfoEl } from './setup-overlay'
import { moduleChild } from './util'

videoEl.addEventListener('play', () => {
  moduleChild('playback', iconsEl.pause)
  showOverlayPlaybackIcon(iconsEl.play)
})

videoEl.addEventListener('pause', () => {
  moduleChild('playback', iconsEl.play)
  showOverlayPlaybackIcon(iconsEl.pause)
})

let clickTimer: NodeJS.Timeout | undefined | null

overlayEl.addEventListener('click', event => {
  if (event.pointerType !== 'mouse') {
    return
  }

  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    toggleFullscreen()
  } else {
    clickTimer = setTimeout(() => {
      togglePlayback()
      clickTimer = null
    }, 200)
  }
})

export function togglePlayback() {
  if (videoEl.paused || videoEl.ended) {
    videoEl.play()
    tooltip.playback.update('Pause')
  } else {
    videoEl.pause()
    tooltip.playback.update('Play')
  }
}

playbackInfoEl.addEventListener('touchend', togglePlayback)

export function hideOverlayPlayback() {
  playbackInfoEl.style.opacity = '0'
  playbackInfoEl.style.transform = 'scale(0)'
}

let hideInfoTimer: NodeJS.Timeout | undefined
export function showOverlayPlaybackIcon(icon?: SVGElement) {
  requestAnimationFrame(() => {
    const currentChild = playbackInfoEl.firstElementChild
    if (icon) {
      if (currentChild) {
        if (currentChild !== icon) {
          currentChild.replaceWith(icon)
        }
      } else {
        playbackInfoEl.append(icon)
      }
    } else if (!currentChild) {
      playbackInfoEl.append(videoEl.paused || videoEl.ended ? iconsEl.pause : iconsEl.play)
    }

    playbackInfoEl.style.opacity = '1'
    playbackInfoEl.style.transform = 'scale(1)'

    clearTimeout(hideInfoTimer)

    hideInfoTimer = setTimeout(() => {
      hideInfoTimer = undefined
      hideOverlayPlayback()
    }, 2000)
  })
}
