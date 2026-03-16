import { controlEl, playerEl } from '~c/elements'
import { updateTimeline } from './setup-timeline'
import { scheduleHide } from './setup-tooltip'

let isHoveringVideo = false
let isHoveringControls = false
let hideTimer: NodeJS.Timeout | undefined

export const controlState = {
  isVisible: false,
}

const showControls = () => {
  if (!controlState.isVisible) {
    controlState.isVisible = true
    updateTimeline()
  }

  controlEl.style.opacity = '1'
  playerEl.style.cursor = 'default'

  clearTimeout(hideTimer)

  if (isHoveringVideo && !isHoveringControls) {
    hideTimer = setTimeout(() => {
      hideControl()
      playerEl.style.cursor = 'none'
    }, 2000)
  }
}

playerEl.addEventListener('mouseenter', () => {
  isHoveringVideo = true
  showControls()
})

playerEl.addEventListener('mousemove', () => {
  showControls()
})

playerEl.addEventListener('mouseleave', () => {
  isHoveringVideo = false
  clearTimeout(hideTimer)

  setTimeout(() => {
    if (!isHoveringVideo && !isHoveringControls) {
      hideControl()
      playerEl.style.cursor = 'default'
    }
  }, 500)
})

controlEl.addEventListener('mouseenter', () => {
  isHoveringControls = true
  clearTimeout(hideTimer)
})

controlEl.addEventListener('mouseleave', () => {
  isHoveringControls = false
  showControls()
})

function hideControl() {
  controlState.isVisible = false
  controlEl.style.opacity = '0'

  scheduleHide()
}
