import { controlModule } from './setup-module'

export function moduleChild(module: keyof typeof controlModule): Element | null
export function moduleChild(module: keyof typeof controlModule, icon: SVGSVGElement): void
export function moduleChild(module: keyof typeof controlModule, icon?: SVGSVGElement) {
  const child = controlModule[module].firstElementChild

  if (icon) {
    if (child !== icon) {
      child?.replaceWith(icon)
    }
  } else {
    return child
  }
}
