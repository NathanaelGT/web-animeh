import { videoEl, iconsEl } from '~c/elements'
import { toggleFullscreen } from './setup-fullscreen'
import { moduleChild } from './util'

videoEl.addEventListener('play', () => {
  moduleChild('playback', iconsEl.pause)
})

videoEl.addEventListener('pause', () => {
  moduleChild('playback', iconsEl.play)
})

let clickTimer: NodeJS.Timeout | undefined | null

videoEl.addEventListener('click', () => {
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
  } else {
    videoEl.pause()
  }
}
