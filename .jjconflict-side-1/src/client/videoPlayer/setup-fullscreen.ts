import { playerEl, iconsEl } from '~c/elements'
import { moduleChild, updateTooltip } from './util'

const playerBg = 'bg-primary-foreground'

playerEl.classList.add(playerBg)

playerEl.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement === playerEl) {
    moduleChild('fullscreen', iconsEl.minimize)
    playerEl.classList.remove(playerBg)

    return
  }

  moduleChild('fullscreen', iconsEl.maximize)
  playerEl.classList.add(playerBg)
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
