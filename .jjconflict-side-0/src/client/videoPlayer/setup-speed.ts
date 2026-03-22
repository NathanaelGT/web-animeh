import { videoEl, iconsEl } from '~c/elements'
import { clientProfileSettingsStore } from '~c/stores'
import { createElement } from '~c/utils/dom'
import { tooltip } from './setup-module'
import { speedOverlayEl } from './setup-overlay'

const PRESETS = [0.5, 1, 1.3, 1.7, 2]

const minusBtn = createElement(
  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/20',
  'button',
)
minusBtn.textContent = '-'

const speedInput = createElement(
  'w-16 bg-transparent text-center text-lg font-medium text-white outline-none',
  'input',
)
speedInput.type = 'text'
speedInput.value = '1'
speedInput.inputMode = 'decimal'

const plusBtn = createElement(
  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-sm hover:bg-white/20',
  'button',
)
plusBtn.textContent = '+'

const topRow = createElement('flex items-center justify-center gap-2')
topRow.append(minusBtn, speedInput, plusBtn)

const sliderEl = createElement(
  'h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
  'input',
)
sliderEl.type = 'range'
sliderEl.min = '0.25'
sliderEl.max = '4'
sliderEl.step = '0.05'
sliderEl.value = '1'

const presetRow = createElement('flex items-center justify-between gap-4')

PRESETS.forEach(speed => {
  const btn = createElement(
    'w-13 cursor-pointer rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white border border-border',
    'button',
  )

  btn.textContent = speed.toString()
  btn.addEventListener('click', () => {
    setSpeed(speed)
  })

  presetRow.append(btn)
})

const menuEl = createElement(
  'absolute bottom-full right-0 mb-6 flex flex-col gap-6 rounded-xl bg-black/80 p-8 backdrop-blur-md border border-border',
)
menuEl.style.opacity = '0'
menuEl.style.transform = 'translateY(4px) scale(0.95)'
menuEl.style.transition = 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out'
menuEl.style.minWidth = '200px'
menuEl.append(topRow, sliderEl, presetRow)

export const speedButtonEl = createElement()
speedButtonEl.append(iconsEl.speed)
speedButtonEl.addEventListener('click', toggleMenu)

const wrapperEl = createElement('relative')
wrapperEl.append(speedButtonEl, menuEl)

export { wrapperEl as speedWrapperEl }

let isOpen = false

function toggleMenu() {
  isOpen ? closeMenu() : openMenu()
}

function openMenu() {
  isOpen = true
  menuEl.style.opacity = '1'
  menuEl.style.transform = 'translateY(0) scale(1)'
  menuEl.style.pointerEvents = 'auto'

  tooltip.speed.disable()

  requestAnimationFrame(() => {
    document.addEventListener('pointerdown', handleOutsideClick)
  })
}

function closeMenu() {
  isOpen = false
  menuEl.style.opacity = '0'
  menuEl.style.transform = 'translateY(4px) scale(0.95)'
  menuEl.style.pointerEvents = 'none'

  tooltip.speed.enable()

  document.removeEventListener('pointerdown', handleOutsideClick)
}

function handleOutsideClick(event: PointerEvent) {
  if (!wrapperEl.contains(event.target as Node)) {
    closeMenu()
  }
}

function setSpeed(value: number) {
  const speed = Math.max(value, 0.1)
  videoEl.playbackRate = speed
  syncUI(speed)
}

function syncUI(speed: number) {
  speedInput.value = speed.toFixed(
    decimalFractionDigits(clientProfileSettingsStore.state.videoPlayer.speedStep) ||
      decimalFractionDigits(speed),
  )
  sliderEl.value = speed.toString()
}

minusBtn.addEventListener('click', decreaseSpeed)

plusBtn.addEventListener('click', increaseSpeed)

sliderEl.addEventListener('input', () => {
  setSpeed(parseFloat(sliderEl.value))
})

speedInput.addEventListener('change', () => {
  const parsed = parseFloat(speedInput.value)
  if (isNaN(parsed)) {
    syncUI(videoEl.playbackRate)
  } else {
    setSpeed(parsed)
  }
})

videoEl.addEventListener('ratechange', () => {
  syncUI(videoEl.playbackRate)
})

setTimeout(() => {
  setSpeed(clientProfileSettingsStore.state.videoPlayer.defaultSpeed)
})

export function decreaseSpeed(silent?: any) {
  const { speedStep } = clientProfileSettingsStore.state.videoPlayer

  const newSpeed = Math.max(0.1, videoEl.playbackRate - speedStep)

  setSpeedAndShowOverlay(newSpeed, speedStep, !silent)
}

export function increaseSpeed(silent?: any) {
  const { speedStep } = clientProfileSettingsStore.state.videoPlayer

  const newSpeed = Math.min(8, videoEl.playbackRate + speedStep)

  setSpeedAndShowOverlay(newSpeed, speedStep, !silent)
}

export function toggleSpeed() {
  if (videoEl.playbackRate !== 1) {
    localStorage.setItem('speedToggle', videoEl.playbackRate.toString())

    videoEl.playbackRate = 1
  } else {
    const savedSpeed = parseFloat(localStorage.getItem('speedToggle') || '1')
    if (isNaN(savedSpeed) || savedSpeed === 1) {
      return
    }

    videoEl.playbackRate = savedSpeed
  }
}

let showOverlayTimeout: NodeJS.Timeout | undefined
function setSpeedAndShowOverlay(speed: number, step: number, showOverlay?: any) {
  const speedStr = speed.toFixed(decimalFractionDigits(step) || decimalFractionDigits(speed))
  videoEl.playbackRate = Number(speedStr) // untuk menghindari floating point precision issue

  if (showOverlay) {
    speedOverlayEl.textContent = speedStr
    speedOverlayEl.style.opacity = '1'

    clearTimeout(showOverlayTimeout)
    showOverlayTimeout = setTimeout(() => {
      showOverlayTimeout = undefined
      speedOverlayEl.style.opacity = '0'
    }, 2000)
  }
}

function decimalFractionDigits(value: number): number {
  const valueStr = value.toString()
  const indexOfDecimal = valueStr.indexOf('.')

  if (indexOfDecimal === -1) {
    return 0
  }
  return valueStr.slice(indexOfDecimal + 1).length
}
