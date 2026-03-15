import { leftControlEl, centerControlEl, rightControlEl, iconsEl } from '~c/elements'
import { toggleFullscreen } from './setup-fullscreen'
import { togglePlayback } from './setup-playback'
import { timeEl } from './setup-timeline'
import { toggleMute, volumeSliderEl } from './setup-volume'

export const controlModule = (() => {
  const module = {
    playback: el(iconsEl.play, togglePlayback),

    volume: el(iconsEl.volume.high, toggleMute),

    time: timeEl,

    fullscreen: el(iconsEl.maximize, toggleFullscreen),
  }

  leftControlEl.append(group(module.playback), group([module.volume, volumeSliderEl]))
  centerControlEl.append(group(module.time))
  rightControlEl.append(group(module.fullscreen))

  return module

  function el(defaultIcon: SVGElement, onClick: () => void) {
    const element = div()

    element.append(defaultIcon)
    element.addEventListener('click', onClick)

    return element
  }

  type AtLeastOne<T> = [T, ...T[]]
  type GroupElement = HTMLElement | AtLeastOne<HTMLElement>

  function group(...elements: AtLeastOne<GroupElement>) {
    const classList = ['cursor-pointer', 'rounded-full', 'p-1', 'hover:bg-gray-50/10']
    const element = div(
      'flex items-center rounded-full bg-black/40 p-1 has-[>:nth-child(2)]:*:px-3',
    )

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]!
      if (el instanceof HTMLElement) {
        el.classList.add(...classList)
        element.append(el)
      } else {
        element.classList.add('w-10', 'overflow-hidden')
        element.style.transition = 'width 0.2s ease-in-out'

        const wrapper = div(classList.join(' ') + ' flex items-center gap-3')
        wrapper.append(...el)

        element.addEventListener('mouseenter', () => {
          const target = wrapper.getBoundingClientRect().width
          element.style.width = `calc(${target}px + var(--spacing) * 2)` // padding
        })

        element.addEventListener('mouseleave', () => {
          element.style.width = ''
        })

        el.at(-1)?.classList.add('mr-1')

        element.append(wrapper)
      }
    }

    return element
  }

  function div(className = '') {
    const div = document.createElement('div')

    div.className = className

    return div
  }
})()
