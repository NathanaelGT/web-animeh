import { controlEl, playerEl, timelineEl } from '~c/elements'
import { createElement } from '~c/utils/dom'
import { createReactiveDOMRect } from '~c/utils/reactiveRect'
import { clamp } from '~/shared/utils/number'

const tooltip = createElement(
  'fixed text-md text-white bg-background px-2 py-1 rounded-md pointer-events-none z-1 whitespace-pre-wrap text-center',
)

tooltip.style.left = '0'
tooltip.style.bottom = '0'
tooltip.style.opacity = '0'
tooltip.style.willChange = 'transform, opacity'

const TRANSITION_TIME_MS = 200
const TRANSITION_OPACITY = `opacity ${TRANSITION_TIME_MS}ms ease-in-out`
const TRANSITION_FULL = `${TRANSITION_OPACITY}, transform ${TRANSITION_TIME_MS}ms ease-in-out`

const tooltipTexts = new WeakMap<HTMLElement, string>()

let currentOwner: HTMLElement | null = null
let hideTimer: NodeJS.Timeout | null = null

const EDGE_PADDING = 16

const handleRect = createReactiveDOMRect(timelineEl.children[2] as HTMLElement) // engga pake handleEl karena kena circular dependency
const playerRect = createReactiveDOMRect(playerEl)

function updateTooltipTransform(x: number) {
  const halfWidth = tooltip.offsetWidth / 2

  const min = playerRect.left + EDGE_PADDING + halfWidth
  const max = playerRect.right - EDGE_PADDING - halfWidth

  const left = clamp(x, min, max)
  const top = window.innerHeight - handleRect.top + 4

  tooltip.style.transform = `translate3d(${left}px, ${-top}px, 0) translateX(-50%)`
}

function positionTooltip(target: HTMLElement) {
  const rect = target.getBoundingClientRect()
  updateTooltipTransform(rect.left + rect.width / 2)
}

function showTooltip(owner: HTMLElement) {
  const wasVisible = tooltip.style.opacity === '1'

  currentOwner = owner

  tooltip.textContent = tooltipTexts.get(owner) ?? ''

  if (!tooltip.parentNode) {
    tooltip.style.visibility = 'hidden'
    playerEl.append(tooltip)
  }

  tooltip.style.transition = wasVisible ? TRANSITION_FULL : TRANSITION_OPACITY

  tooltip.style.visibility = 'visible'

  positionTooltip(owner)

  requestAnimationFrame(() => {
    if (currentOwner !== owner) return
    tooltip.style.opacity = '1'
  })
}

export function scheduleHide() {
  hideTimer ??= setTimeout(() => {
    hideTimer = null
    tooltip.style.opacity = '0'
  }, TRANSITION_TIME_MS * 0.75)
}

tooltip.addEventListener('transitionend', event => {
  if (event.propertyName === 'opacity' && tooltip.style.opacity === '0') {
    tooltip.remove()
    tooltip.style.transform = ''
    currentOwner = null
  }
})

function findTooltipOwner(el: HTMLElement | null): HTMLElement | undefined {
  for (; el; el = el.parentElement) {
    if (tooltipTexts.has(el)) {
      return el
    }
  }
}

controlEl.addEventListener('pointermove', event => {
  const target = event.target as HTMLElement | null
  const owner = findTooltipOwner(target)

  if (owner) {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (currentOwner !== owner) {
      showTooltip(owner)
    }
  } else if (currentOwner) {
    scheduleHide()
  }
})

controlEl.addEventListener('pointerleave', () => {
  if (currentOwner) {
    scheduleHide()
  }
})

export function attachTooltip<TText extends string>(target: HTMLElement, text: TText) {
  tooltipTexts.set(target, text)

  return (newText: TText) => {
    tooltipTexts.set(target, newText)

    if (currentOwner === target && tooltip.parentNode) {
      tooltip.textContent = newText
      positionTooltip(target)
    }
  }
}
