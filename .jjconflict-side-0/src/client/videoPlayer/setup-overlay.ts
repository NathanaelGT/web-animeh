import { overlayEl, videoEl } from '~c/elements'
import { timeStartEl, updateSeeker, updateTime } from './setup-timeline'
import { getJumpTime } from './util'

const [leftOverlayEl, _centerOverlayEl, rightOverlayEl] = overlayEl.children as unknown as [
  HTMLDivElement,
  HTMLDivElement,
  HTMLDivElement,
]

const backwardInfoEl = leftOverlayEl.firstElementChild as HTMLDivElement
const forwardInfoEl = rightOverlayEl.firstElementChild as HTMLDivElement

registerJumpGesture(leftOverlayEl, backwardInfoEl, -1)
registerJumpGesture(rightOverlayEl, forwardInfoEl, 1)

function registerJumpGesture(
  overlayEl: HTMLElement,
  infoEl: HTMLElement,
  multiplier: 1 | -1,
): void {
  let tapTimer: NodeJS.Timeout | null = null
  let holdTimer: NodeJS.Timeout | null = null
  let graceTimer: NodeJS.Timeout | null = null
  let isInGracePeriod = false
  let waitingForSecondTap = false
  let secondTapDown = false
  let total = 0

  const textEl = infoEl.firstElementChild as HTMLElement

  overlayEl.addEventListener('selectstart', event => {
    event.preventDefault()
  })

  overlayEl.addEventListener('touchstart', () => {
    if (isInGracePeriod) {
      jump()

      return
    }

    if (waitingForSecondTap) {
      secondTapDown = true
      waitingForSecondTap = false
      if (tapTimer) {
        clearTimeout(tapTimer)
      }

      holdTimer = setTimeout(() => {
        secondTapDown = false

        jump('long')
        showInfo()
      }, 500)
      return
    }

    waitingForSecondTap = true
    tapTimer = setTimeout(() => {
      waitingForSecondTap = false
    }, 300)
  })

  overlayEl.addEventListener('touchend', () => {
    if (!secondTapDown) return

    secondTapDown = false
    if (holdTimer) {
      clearTimeout(holdTimer)
    }

    jump()
    showInfo()
  })

  function jump(variant?: Parameters<typeof getJumpTime>[0]) {
    const jumpTime = getJumpTime(variant)
    const newTime = videoEl.currentTime + jumpTime * multiplier

    videoEl.currentTime = newTime
    textEl.textContent = (total += jumpTime).toString()

    timeStartEl.textContent = updateTime(newTime)
    updateSeeker(newTime)

    if (graceTimer) {
      clearTimeout(graceTimer)
    }
    graceTimer = setTimeout(hideInfo, 1500)
  }

  function showInfo() {
    infoEl.style.opacity = '1'
    infoEl.style.transform = 'scale(1)'

    isInGracePeriod = true
  }

  function hideInfo() {
    infoEl.style.opacity = '0'
    infoEl.style.transform = 'scale(0)'

    isInGracePeriod = false
    total = 0
  }
}
