export type ReactiveDOMRect = {
  readonly x: number
  readonly y: number
  readonly top: number
  readonly left: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
  destroy(): void
}

type MutableDOMRect = {
  x: number
  y: number
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

type InternalRect = MutableDOMRect & {
  __update(): void
  __visible: boolean
  destroy(): void
}

const rects = new Set<InternalRect>()

let raf = 0

function scheduleUpdate() {
  if (raf) return

  raf = requestAnimationFrame(() => {
    raf = 0

    rects.forEach(r => {
      if (r.__visible) {
        r.__update()
      }
    })
  })
}

export function createReactiveDOMRect(el: HTMLElement): ReactiveDOMRect {
  const rect: InternalRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    __visible: true,

    __update() {
      const r = el.getBoundingClientRect()

      rect.x = r.x
      rect.y = r.y
      rect.top = r.top
      rect.left = r.left
      rect.right = r.right
      rect.bottom = r.bottom
      rect.width = r.width
      rect.height = r.height
    },

    destroy() {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      rects.delete(rect)
    },
  }

  const resizeObserver = new ResizeObserver(scheduleUpdate)

  const intersectionObserver = new IntersectionObserver(entries => {
    rect.__visible = entries[0]!.isIntersecting
  })

  resizeObserver.observe(el)
  intersectionObserver.observe(el)

  rects.add(rect)

  scheduleUpdate()

  return rect
}

window.addEventListener('scroll', scheduleUpdate, true)
window.addEventListener('resize', scheduleUpdate)
