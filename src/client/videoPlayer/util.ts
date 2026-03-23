import { videoEl } from '~c/elements'
import { clientProfileSettingsStore } from '~c/stores'
import { clamp } from '~/shared/utils/number'
import { ucFirst } from '~/shared/utils/string'
import { controlModule } from './setup-module'

type Module = keyof (typeof controlModule)['el']

export function moduleChild(module: Module): Element | null
export function moduleChild(module: Module, icon: SVGSVGElement): void
export function moduleChild(module: Module, icon?: SVGSVGElement) {
  const moduleEl = controlModule.el[module]
  const child = moduleEl.firstElementChild

  if (icon) {
    if (child) {
      if (child !== icon) {
        child.replaceWith(icon)
      }
    } else {
      moduleEl.append(icon)
    }
  } else {
    return child
  }
}

let capturedTime = 0
let captureTimeout: NodeJS.Timeout | undefined
export function getJumpTime(multiplier: 1 | -1, variant: '' | 'long' = '') {
  const setting = clientProfileSettingsStore.state.videoPlayer

  const prefix = variant ? (`${variant}J` as const) : 'j'

  const time = setting[`${prefix}umpSec`]

  const isRelative = setting[`relative${ucFirst(variant)}Jump`]

  const jumpTime = isRelative ? time * videoEl.playbackRate : time
  const newTime = clamp(videoEl.currentTime + jumpTime * multiplier, 0, videoEl.duration)

  if (!variant) {
    if (capturedTime) {
      const diff = Math.abs(newTime - capturedTime)
      if (diff < jumpTime) {
        clearTimeout(captureTimeout)
        capturedTime = 0

        return [newTime - diff, jumpTime - diff] as const
      }
    } else {
      capturedTime = videoEl.currentTime

      clearTimeout(captureTimeout)
      captureTimeout = setTimeout(() => {
        captureTimeout = undefined
        capturedTime = 0
      }, jumpTime * 1000)
    }
  }

  return [newTime, jumpTime] as const
}
