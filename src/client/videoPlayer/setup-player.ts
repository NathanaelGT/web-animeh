import { controlEl, iconsEl, playerEl, timelineWrapperEl, videoEl } from '~c/elements'
import { controlModule } from './setup-module'
import { overlayState } from './setup-overlay'
import { hideOverlayPlayback, showOverlayPlaybackIcon } from './setup-playback'
import { syncSpeedUI } from './setup-speed'
import {
  addTimelineListeners,
  handleEl,
  removeTimelineListeners,
  timeStartEl,
  timeEndEl,
  updateTimeline,
} from './setup-timeline'
import { scheduleHide } from './setup-tooltip'

let isHoveringVideo = false
let isHoveringControls = false
let hideTimer: NodeJS.Timeout | undefined

export const controlState = {
  isVisible: false,
  isFineScrubbing: false,
}

export const playerState = {
  ready: false,
}

export function showControls() {
  if (!controlState.isVisible) {
    controlState.isVisible = true
    updateTimeline()

    controlEl.style.opacity = '1'
    playerEl.style.cursor = 'default'
  }

  clearTimeout(hideTimer)

  if (!isHoveringControls) {
    scheduleHideControl()
  }
}

export function hideControl() {
  controlState.isVisible = false
  controlEl.style.opacity = '0'

  scheduleHide()
}

export function scheduleHideControl() {
  hideTimer = setTimeout(() => {
    if (controlState.isFineScrubbing) {
      return
    }

    hideControl()
    playerEl.style.cursor = 'none'
  }, 2000)
}

function handlePlayerPointerEnter(event: PointerEvent) {
  if (overlayState.isVisible) {
    return
  }

  if (event.pointerType === 'mouse') {
    isHoveringVideo = true
    playerEl.addEventListener('pointerleave', handlePlayerPointerLeave)
  } else {
    if (controlState.isVisible) {
      const el = document.elementFromPoint(event.pageX - pageXOffset, event.pageY - pageYOffset)

      if (!controlEl.contains(el)) {
        hideControl()
        hideOverlayPlayback()

        return
      }
    }

    showOverlayPlaybackIcon()

    playerEl.removeEventListener('pointerleave', handlePlayerPointerLeave)
  }

  showControls()
}

function handlePlayerPointerMove() {
  showControls()
}

function handlePlayerPointerLeave() {
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

function handleControlPointerEnter() {
  isHoveringControls = true
  clearTimeout(hideTimer)
}

function handleControlPointerLeave() {
  isHoveringControls = false
  showControls()
}

export function addPlayerListeners() {
  playerEl.addEventListener('pointerenter', handlePlayerPointerEnter)
  playerEl.addEventListener('pointermove', handlePlayerPointerMove)
  controlEl.addEventListener('pointerenter', handleControlPointerEnter)
  controlEl.addEventListener('pointerleave', handleControlPointerLeave)
}

export function removePlayerListeners() {
  playerEl.removeEventListener('pointerenter', handlePlayerPointerEnter)
  playerEl.removeEventListener('pointermove', handlePlayerPointerMove)
  controlEl.removeEventListener('pointerenter', handleControlPointerEnter)
  controlEl.removeEventListener('pointerleave', handleControlPointerLeave)
}

addPlayerListeners()

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

function handleVideoPlay() {
  showOverlayPlaybackIcon(iconsEl.play)
}

function handleVideoPause() {
  showOverlayPlaybackIcon(iconsEl.pause)
}

function addVideoPlayPauseListeners() {
  videoEl.addEventListener('play', handleVideoPlay)
  videoEl.addEventListener('pause', handleVideoPause)
}

function removeVideoPlayPauseListeners() {
  videoEl.removeEventListener('play', handleVideoPlay)
  videoEl.removeEventListener('pause', handleVideoPause)
}

function disableInteraction(...elements: HTMLElement[]) {
  for (const el of elements) {
    el.classList.add('pointer-events-none')
  }
}

function enableInteraction(...elements: HTMLElement[]) {
  for (const el of elements) {
    el.classList.remove('pointer-events-none')
  }
}

videoEl.setSrc = function (src) {
  playerState.ready = false

  videoEl.removeEventListener('ratechange', syncSpeedUI)

  removeVideoPlayPauseListeners()
  removeTimelineListeners()
  disableInteraction(timelineWrapperEl, controlModule.el.playback)

  timeStartEl.textContent = '0:00'
  timeEndEl.textContent = '0:00'

  handleEl.style.width = '0'

  videoEl.onloadedmetadata = () => {
    videoEl.onloadedmetadata = null

    addTimelineListeners()
    enableInteraction(timelineWrapperEl, controlModule.el.playback)

    handleEl.style.width = ''
  }

  videoEl.onloadeddata = () => {
    videoEl.onloadeddata = null

    playerState.ready = true

    const play = () => {
      if (!videoEl.paused) {
        addVideoPlayPauseListeners()
        return
      }

      videoEl.onplay = () => {
        videoEl.onplay = null
        videoEl.muted = false

        requestAnimationFrame(addVideoPlayPauseListeners)
      }

      videoEl.muted = true
      videoEl.play()
    }

    if (document.hidden) {
      document.addEventListener('visibilitychange', play, { once: true })
    } else {
      play()
    }
  }

  const currentSpeed = videoEl.playbackRate

  // @ts-expect-error wrapper
  videoEl.src = src
  videoEl.playbackRate = currentSpeed

  videoEl.addEventListener('ratechange', syncSpeedUI)
}
