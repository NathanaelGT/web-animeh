import { leftControlEl, centerControlEl, rightControlEl, iconsEl } from '~c/elements'
import { createElement } from '~c/utils/dom'
import { createReactiveDOMRect } from '~c/utils/reactiveRect'
import { isTouchDevice } from '../utils'
import { toggleFullscreen } from './setup-fullscreen'
import { togglePlayback } from './setup-playback'
import { speedButtonEl, speedWrapperEl } from './setup-speed'
import { timeEl } from './setup-timeline'
import { attachTooltip } from './setup-tooltip'
import { toggleMute, volumeSliderWrapperEl } from './setup-volume'

export const controlModule = (() => {
  const playback = el(iconsEl.play, togglePlayback)
  const volume = el(iconsEl.volume.high, toggleMute)
  const time = timeEl
  const speed = speedButtonEl
  const fullscreen = el(iconsEl.maximize, toggleFullscreen)

  assign(leftControlEl, group(playback, true), group([volume, volumeSliderWrapperEl]))
  assign(centerControlEl, group(time))
  assign(rightControlEl, group(speedWrapperEl), group(fullscreen))

  return {
    el: { playback, volume, time, speed, fullscreen },
    tooltip: {
      playback: attachTooltip<'Play' | 'Pause'>(playback, 'Play'),
      volume: attachTooltip<'Mute' | 'Unmute'>(volume, 'Mute'),
      volumeSlider: attachTooltip(volumeSliderWrapperEl, 'Volume'),
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

  function group(...elements: [...GroupElement[], GroupElement | true]) {
    const isMouseOnly = elements.at(-1) === true
    if (isMouseOnly) {
      if (isTouchDevice) {
        return null
      }

      elements.pop()
    }

    const classList = ['cursor-pointer', 'rounded-full', 'p-1', 'hover:bg-gray-50/10']
    const element = createElement(
      'flex  items-center rounded-full bg-black/60 p-1 has-[>:nth-child(2)]:*:px-3',
    )

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as GroupElement
      if (el instanceof HTMLElement) {
        el.classList.add(...classList)
        element.append(el)
      } else {
        element.classList.add('w-10', 'overflow-hidden')
        element.style.transition = 'width 0.2s ease-in-out'

        const wrapper = createElement(
          classList.join(' ') + ' flex items-center *:px-1.5 *:first:pl-0 *:last:pr-0',
        )
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

  function assign(controlEl: HTMLElement, ...group: (HTMLDivElement | null)[]) {
    controlEl.append(...group.filter(el => el !== null))
  }
})()

export const tooltip = controlModule.tooltip
