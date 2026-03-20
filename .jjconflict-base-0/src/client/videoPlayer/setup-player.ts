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

function handlePlayerMouseEnter() {
  isHoveringVideo = true
  showControls()
}

function handlePlayerMouseMove() {
  showControls()
}

function handlePlayerMouseLeave() {
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
}

function handleControlMouseEnter() {
  isHoveringControls = true
  clearTimeout(hideTimer)
}

function handleControlMouseLeave() {
  isHoveringControls = false
  showControls()
}

export function addPlayerListeners() {
  playerEl.addEventListener('mouseenter', handlePlayerMouseEnter)
  playerEl.addEventListener('mousemove', handlePlayerMouseMove)
  playerEl.addEventListener('mouseleave', handlePlayerMouseLeave)
  controlEl.addEventListener('mouseenter', handleControlMouseEnter)
  controlEl.addEventListener('mouseleave', handleControlMouseLeave)
}

export function removePlayerListeners() {
  playerEl.removeEventListener('mouseenter', handlePlayerMouseEnter)
  playerEl.removeEventListener('mousemove', handlePlayerMouseMove)
  playerEl.removeEventListener('mouseleave', handlePlayerMouseLeave)
  controlEl.removeEventListener('mouseenter', handleControlMouseEnter)
  controlEl.removeEventListener('mouseleave', handleControlMouseLeave)
}

addPlayerListeners()

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
