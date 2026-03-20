import { playerEl, iconsEl } from '../elements'
import { moduleChild, updateTooltip } from './util'

playerEl.addEventListener('fullscreenchange', () => {
  moduleChild(
    'fullscreen',
    document.fullscreenElement === playerEl ? iconsEl.minimize : iconsEl.maximize,
  )
})

export async function toggleFullscreen() {
  const promise =
    document.fullscreenElement === playerEl
      ? document.exitFullscreen()
      : playerEl.requestFullscreen()

  await promise

  updateTooltip(
    'fullscreen',
    `${document.fullscreenElement === playerEl ? 'Exit f' : 'F'}ullscreen`,
  )
}
