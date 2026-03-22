import { videoEl, iconsEl } from '~c/elements'
import { createElement } from '~c/utils/dom'
import { tooltip } from './setup-module'

const SPEED_STEP = 0.1
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
  const speed = Math.max(value, 0)
  videoEl.playbackRate = speed
  syncUI(speed)
}

function syncUI(speed: number) {
  speedInput.value = speed.toFixed(speed % 1 === 0 ? 0 : 2).replace(/0$/, '')
  sliderEl.value = speed.toString()
}

minusBtn.addEventListener('click', () => {
  setSpeed(videoEl.playbackRate - SPEED_STEP)
})

plusBtn.addEventListener('click', () => {
  setSpeed(videoEl.playbackRate + SPEED_STEP)
})

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
  sliderEl.value = videoEl.playbackRate.toString()
})
