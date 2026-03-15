import { playerEl } from '../elements'
import { handleEl } from './setup-timeline'

const tooltip = document.createElement('div')
tooltip.className =
  'fixed text-md text-white bg-background px-2 py-1 rounded-md pointer-events-none z-50'

const TRANSITION = 'opacity 0.2s ease-in-out, top 0.2s ease-in-out, left 0.2s ease-in-out'
tooltip.style.transition = TRANSITION
tooltip.style.opacity = '0'

let currentOwner: HTMLElement | undefined | null

const EDGE_PADDING = 16

function positionTooltip(target: HTMLElement) {
  const handleRect = handleEl.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const playerRect = playerEl.getBoundingClientRect()

  let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
  const top = handleRect.top - tooltipRect.height - 4

  const minLeft = playerRect.left + EDGE_PADDING
  left = Math.max(minLeft, left)

  const maxLeft = playerRect.right - tooltipRect.width - EDGE_PADDING
  left = Math.min(left, maxLeft)

  tooltip.style.left = left + 'px'
  tooltip.style.top = top + 'px'
}

tooltip.addEventListener('transitionend', event => {
  if (event.propertyName === 'opacity' && tooltip.style.opacity === '0') {
    tooltip.remove()

    tooltip.style.left = ''
    tooltip.style.top = ''
    currentOwner = null
  }
})

export function attachTooltip<TText extends string>(target: HTMLElement, initialText: TText) {
  let currentText = initialText

  target.addEventListener('mouseenter', () => {
    currentOwner = target
    tooltip.textContent = currentText

    if (!tooltip.parentNode) {
      tooltip.style.visibility = 'hidden'
      playerEl.appendChild(tooltip)
    }

    tooltip.style.transition = TRANSITION
    positionTooltip(target)
    tooltip.style.visibility = 'visible'

    requestAnimationFrame(() => {
      tooltip.style.opacity = '1'
    })
  })

  target.addEventListener('mouseleave', () => {
    if (currentOwner === target) {
      tooltip.style.opacity = '0'
    }
  })

  return (newText: TText) => {
    currentText = newText

    if (currentOwner === target && tooltip.parentNode) {
      tooltip.style.transition = 'none'

      tooltip.textContent = newText

      positionTooltip(target)

      requestAnimationFrame(() => {
        tooltip.style.transition = TRANSITION
      })
    }
  }
}
