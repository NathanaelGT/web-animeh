import { playerEl, iconsEl } from '../elements'
import { moduleChild } from './util'

playerEl.addEventListener('fullscreenchange', () => {
  moduleChild(
    'fullscreen',
    document.fullscreenElement === playerEl ? iconsEl.minimize : iconsEl.maximize,
  )
})

export function toggleFullscreen() {
  if (document.fullscreenElement === playerEl) {
    document.exitFullscreen()
  } else {
    playerEl.requestFullscreen()
  }
}
