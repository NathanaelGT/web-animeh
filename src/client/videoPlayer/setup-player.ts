import { controlEl, playerEl, videoEl } from '~c/elements'
import { updateTimeline } from './setup-timeline'
import { scheduleHide } from './setup-tooltip'

let isHoveringVideo = false
let isHoveringControls = false
let hideTimer: NodeJS.Timeout | undefined

export const controlState = {
  isVisible: false,
  isFineScrubbing: false,
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
      if (controlState.isFineScrubbing) {
        return
      }

      hideControl()
      playerEl.style.cursor = 'none'
    }, 2000)
  }
}

playerEl.addEventListener('mouseenter', () => {
  if (controlState.isFineScrubbing) {
    return
  }

  isHoveringVideo = true
  showControls()
})

playerEl.addEventListener('mousemove', () => {
  if (controlState.isFineScrubbing) {
    return
  }

  showControls()
})

playerEl.addEventListener('mouseleave', () => {
  if (controlState.isFineScrubbing) {
    return
  }

  isHoveringVideo = false
  clearTimeout(hideTimer)

  setTimeout(() => {
    if (!isHoveringVideo && !isHoveringControls) {
      if (controlState.isFineScrubbing) {
        return
      }

      hideControl()
      playerEl.style.cursor = 'default'
    }
  }, 500)
})

controlEl.addEventListener('mouseenter', () => {
  if (controlState.isFineScrubbing) {
    return
  }

  isHoveringControls = true
  clearTimeout(hideTimer)
})

controlEl.addEventListener('mouseleave', () => {
  if (controlState.isFineScrubbing) {
    return
  }

  isHoveringControls = false
  showControls()
})

function hideControl() {
  controlState.isVisible = false
  controlEl.style.opacity = '0'

  scheduleHide()
}

const defaultKeybindKeys = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  ' ',
  'Home',
  'End',
])

videoEl.addEventListener(
  'keydown',
  event => {
    if (defaultKeybindKeys.has(event.key)) {
      event.preventDefault()
    }
  },
  true,
)
