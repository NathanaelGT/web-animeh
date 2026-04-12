import { videoEl, iconsEl } from '~c/elements'
import { createElement } from '~c/utils/dom'
import { tooltip } from './setup-module'
import { moduleChild } from './util'

videoEl.addEventListener('volumechange', () => {
  const volume = videoEl.volume
  let icon: SVGSVGElement

  if (videoEl.muted) {
    icon = iconsEl.volume.mute
  } else if (volume === 0) {
    icon = iconsEl.volume.off
  } else if (volume > 0 && volume <= 0.6) {
    icon = iconsEl.volume.low
  } else {
    icon = iconsEl.volume.high
  }

  moduleChild('volume', icon)

  volumeSliderEl.valueAsNumber = volume
})

const volumeSliderEl = createElement(
  'flex flex h-full w-24 cursor-pointer appearance-none items-center gap-1 bg-gray-50 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-50',
  'input',
)
volumeSliderEl.type = 'range'
volumeSliderEl.min = '0'
volumeSliderEl.max = '1'
volumeSliderEl.step = '0.01'
volumeSliderEl.valueAsNumber = videoEl.volume
volumeSliderEl.style.background =
  'linear-gradient(to bottom, transparent calc(50% - var(--spacing) * .4), var(--color-gray-50) calc(50% - var(--spacing) * .4) calc(50% + var(--spacing) * .4), transparent calc(50% + var(--spacing) * .4))'

volumeSliderEl.addEventListener('input', () => {
  videoEl.volume = volumeSliderEl.valueAsNumber
})

export const volumeSliderWrapperEl = createElement('h-full w-full')
volumeSliderWrapperEl.append(volumeSliderEl)

export function toggleMute() {
  videoEl.muted = !videoEl.muted

  tooltip.volume.update(videoEl.muted ? 'Unmute' : 'Mute')
}
