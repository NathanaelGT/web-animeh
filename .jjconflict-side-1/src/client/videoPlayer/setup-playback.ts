import { videoEl, iconsEl, overlayEl } from '~c/elements'
import { toggleFullscreen } from './setup-fullscreen'
import { tooltip } from './setup-module'
import { moduleChild } from './util'

videoEl.addEventListener('play', () => {
  moduleChild('playback', iconsEl.pause)
})

videoEl.addEventListener('pause', () => {
  moduleChild('playback', iconsEl.play)
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
