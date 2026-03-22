import { leftControlEl, centerControlEl, rightControlEl, iconsEl } from '~c/elements'
import { createElement } from '~c/utils/dom'
import { createReactiveDOMRect } from '~c/utils/reactiveRect'
import { toggleFullscreen } from './setup-fullscreen'
import { togglePlayback } from './setup-playback'
import { speedButtonEl, speedWrapperEl } from './setup-speed'
import { timeEl } from './setup-timeline'
import { attachTooltip } from './setup-tooltip'
import { toggleMute, volumeSliderEl } from './setup-volume'

export const controlModule = (() => {
  const playback = el(iconsEl.play, togglePlayback)
  const volume = el(iconsEl.volume.high, toggleMute)
  const time = timeEl
  const speed = speedButtonEl
  const fullscreen = el(iconsEl.maximize, toggleFullscreen)

  leftControlEl.append(group(playback), group([volume, volumeSliderEl]))
  centerControlEl.append(group(time))
  rightControlEl.append(group(speedWrapperEl), group(fullscreen))

  return {
    el: { playback, volume, time, speed, fullscreen },
    tooltip: {
      playback: attachTooltip<'Play' | 'Pause'>(playback, 'Play'),
      volume: attachTooltip<'Mute' | 'Unmute'>(volume, 'Mute'),
      volumeSlider: attachTooltip(volumeSliderEl, 'Volume'),
      speed: attachTooltip(speedButtonEl, 'Speed'),
      fullscreen: attachTooltip<'Fullscreen' | 'Exit fullscreen'>(fullscreen, 'Fullscreen'),
    },
  }

  function el(defaultIcon: SVGElement, onClick: () => void) {
    const element = createElement()

    element.append(defaultIcon)
    element.addEventListener('click', onClick)

    return element
  }

  type AtLeastOne<T> = [T, ...T[]]
  type GroupElement = HTMLElement | AtLeastOne<HTMLElement>

  function group(...elements: AtLeastOne<GroupElement>) {
    const classList = ['cursor-pointer', 'rounded-full', 'p-1', 'hover:bg-gray-50/10']
    const element = createElement(
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

        const wrapper = createElement(classList.join(' ') + ' flex items-center gap-3')
        wrapper.append(...el)

        const wrapperRect = createReactiveDOMRect(wrapper)

        element.addEventListener('mouseenter', () => {
          element.style.width = `calc(${wrapperRect.width}px + var(--spacing) * 2)` // padding
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
})()

export const tooltip = controlModule.tooltip
