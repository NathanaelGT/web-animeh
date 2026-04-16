import { videoEl } from '~c/elements'
import { clientProfileSettingsStore } from '~c/stores'
import { clamp, findClosestNumber } from '~/shared/utils/number'
import { ucFirst } from '~/shared/utils/string'
import { iframes } from './setup-jump'
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
export function getJumpTime(multiplier: 1 | -1, variant: '' | 'long' = ''): [number, number] {
  const setting = clientProfileSettingsStore.state.videoPlayer

  const prefix = variant ? (`${variant}J` as const) : 'j'

  const time = setting[`${prefix}umpSec`]

  const isRelative = setting[`relative${ucFirst(variant)}Jump`]

  const { currentTime } = videoEl

  if (setting.padJump && !variant && currentTime < setting.padJumpThreshold) {
    const newTime = setting.padJumpSec

    return [newTime, newTime - currentTime]
  }

  const jumpTime = isRelative ? time * videoEl.playbackRate : time
  const newTime = clamp(currentTime + jumpTime * multiplier, 0, videoEl.duration)

  if (variant) {
    const OP_ED_DURATION = 90

    const iframe = iframes.get(videoEl.src)
    const offset = setting.longSmartJumpOffset / 1000
    const distance = Math.max(Math.abs(OP_ED_DURATION - time), 2) * videoEl.playbackRate

    let iframeTime = findClosestNumber(iframe, currentTime, -1, distance)
    if (iframeTime !== null) {
      iframeTime += OP_ED_DURATION * multiplier - offset

      return [iframeTime, Math.abs(iframeTime - currentTime)]
    }

    iframeTime = findClosestNumber(iframe, newTime, time > OP_ED_DURATION ? -1 : 1, distance)
    if (iframeTime !== null) {
      iframeTime -= offset

      return [iframeTime, Math.abs(iframeTime - currentTime)]
    }
  } else {
    if (capturedTime) {
      const diff = Math.abs(newTime - capturedTime)
      if (diff < jumpTime) {
        clearTimeout(captureTimeout)
        capturedTime = 0

        const min = diff + setting.smartJumpOffset / 1000

        return [newTime - min, jumpTime - min]
      }
    } else {
      capturedTime = currentTime

      clearTimeout(captureTimeout)
      captureTimeout = setTimeout(() => {
        captureTimeout = undefined
        capturedTime = 0
      }, jumpTime * 1000)
    }
  }

  return [newTime, jumpTime]
}
