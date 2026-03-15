import { videoEl, iconsEl } from '~c/elements'
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

export const volumeSliderEl = document.createElement('input')
volumeSliderEl.type = 'range'
volumeSliderEl.min = '0'
volumeSliderEl.max = '1'
volumeSliderEl.step = '0.01'
volumeSliderEl.valueAsNumber = videoEl.volume
volumeSliderEl.className =
  'py-1flex flex h-1 w-24 cursor-pointer appearance-none items-center gap-1 rounded-full bg-gray-50 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-50'

volumeSliderEl.addEventListener('input', () => {
  videoEl.volume = volumeSliderEl.valueAsNumber
})

export function toggleMute() {
  videoEl.muted = !videoEl.muted
}
