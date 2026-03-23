import { videoEl } from '~c/elements'
import { clientProfileSettingsStore } from '~c/stores'
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
export function getJumpTime(variant: '' | 'long' = '') {
  const prefix = variant ? (`${variant}J` as const) : 'j'

  const time = clientProfileSettingsStore.state.videoPlayer[`${prefix}umpSec`]

  const isRelative = clientProfileSettingsStore.state.videoPlayer[`relative${ucFirst(variant)}Jump`]

  return isRelative ? time * videoEl.playbackRate : time
}
