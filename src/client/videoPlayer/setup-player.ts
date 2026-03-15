import { controlEl, playerEl } from '~c/elements'

let isHoveringVideo = false
let isHoveringControls = false
let hideTimer: NodeJS.Timeout | undefined

const showControls = () => {
  controlEl.style.opacity = '1'
  playerEl.style.cursor = 'default'

  clearTimeout(hideTimer)

  if (isHoveringVideo && !isHoveringControls) {
    hideTimer = setTimeout(() => {
      controlEl.style.opacity = '0'
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
      controlEl.style.opacity = '0'
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
