import { controlEl, playerEl, timelineEl } from '~c/elements'
import { createReactiveDOMRect, type ReactiveDOMRect } from '~c/utils/reactiveRect'
import { clamp } from '~/shared/utils/number'

const tooltip = document.createElement('div')
tooltip.className =
  'fixed text-md text-white bg-background px-2 py-1 rounded-md pointer-events-none z-50 whitespace-pre-wrap text-center'

tooltip.style.left = '0'
tooltip.style.bottom = '0'
tooltip.style.opacity = '0'
tooltip.style.willChange = 'transform, opacity'

const TRANSITION_TIME_MS = 200
const TRANSITION_OPACITY = `opacity ${TRANSITION_TIME_MS}ms ease-in-out`
const TRANSITION_FULL = `${TRANSITION_OPACITY}, transform ${TRANSITION_TIME_MS}ms ease-in-out`

type TooltipPositionInfo = {
  clientX: number
  clientY: number
  ownerRect: DOMRect
  playerRect: ReactiveDOMRect
  handleRect: ReactiveDOMRect
}

const staticTooltipTexts = new WeakMap<HTMLElement, string>()
const dynamicTooltipTexts = new WeakMap<HTMLElement, (info: TooltipPositionInfo) => string>()

let currentOwner: HTMLElement | null = null
let hideTimer: NodeJS.Timeout | null = null

const EDGE_PADDING = 16

const handleRect = createReactiveDOMRect(timelineEl.children[2] as HTMLElement) // engga pake handleEl karena kena circular dependency
const playerRect = createReactiveDOMRect(playerEl)

let latestX = 0
let latestY = 0
let raf = 0

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

function positionTooltipCursor() {
  raf = 0
  updateTooltipTransform(latestX)
}

function scheduleCursorPosition() {
  raf ||= requestAnimationFrame(positionTooltipCursor)
}

function showTooltip(owner: HTMLElement, e: PointerEvent) {
  const wasVisible = tooltip.style.opacity === '1'

  currentOwner = owner
  latestX = e.clientX
  latestY = e.clientY

  const dynamic = dynamicTooltipTexts.get(owner)
  const followCursor = !!dynamic

  tooltip.textContent = dynamic
    ? dynamic({
        clientX: latestX,
        clientY: latestY,
        ownerRect: owner.getBoundingClientRect(),
        playerRect,
        handleRect,
      })
    : (staticTooltipTexts.get(owner) ?? '')

  if (!tooltip.parentNode) {
    tooltip.style.visibility = 'hidden'
    playerEl.append(tooltip)
  }

  tooltip.style.transition = followCursor
    ? TRANSITION_OPACITY
    : wasVisible
      ? TRANSITION_FULL
      : TRANSITION_OPACITY

  tooltip.style.visibility = 'visible'

  if (followCursor) {
    positionTooltipCursor()
  } else {
    positionTooltip(owner)
  }

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
    if (staticTooltipTexts.has(el) || dynamicTooltipTexts.has(el)) {
      return el
    }
  }
}

controlEl.addEventListener('pointermove', event => {
  const target = event.target as HTMLElement | null
  const owner = findTooltipOwner(target)

  latestX = event.clientX
  latestY = event.clientY

  if (owner) {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    const dynamic = dynamicTooltipTexts.get(owner)

    if (currentOwner !== owner) {
      showTooltip(owner, event)
    } else if (dynamic) {
      tooltip.textContent = dynamic({
        clientX: latestX,
        clientY: latestY,
        ownerRect: owner.getBoundingClientRect(),
        playerRect,
        handleRect,
      })

      scheduleCursorPosition()
    }

    return
  }

  if (currentOwner) {
    scheduleHide()
  }
})

controlEl.addEventListener('pointerleave', () => {
  if (currentOwner) {
    scheduleHide()
  }
})

export function attachTooltip<TText extends string>(
  target: HTMLElement,
  text: TText,
): (newText: TText) => void

export function attachTooltip<TText extends string>(
  target: HTMLElement,
  text: (info: TooltipPositionInfo) => TText,
): void

export function attachTooltip<TText extends string>(
  target: HTMLElement,
  text: TText | ((info: TooltipPositionInfo) => TText),
) {
  if (typeof text === 'function') {
    dynamicTooltipTexts.set(target, text)
    return
  }

  staticTooltipTexts.set(target, text)

  return (newText: TText) => {
    staticTooltipTexts.set(target, newText)

    if (currentOwner === target && tooltip.parentNode) {
      tooltip.textContent = newText
      positionTooltip(target)
    }
  }
}
