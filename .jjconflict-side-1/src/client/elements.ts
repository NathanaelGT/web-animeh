export const [root, miniplayerEl] = document.body.children as unknown as [
  HTMLDivElement,
  HTMLDivElement,
]

export const [playerEl, miniplayerFullscreenButtonEl, miniplayerCloseButtonEl] =
  miniplayerEl.children as unknown as [HTMLDivElement, HTMLButtonElement, HTMLButtonElement]

export const [overlayWrapperEl, videoEl, controlEl] = playerEl.children as unknown as [
  HTMLDivElement,
  HTMLVideoElement,
  HTMLDivElement,
]

export const [overlayEl] = overlayWrapperEl.children as unknown as [HTMLDivElement]

export const [timelineWrapperEl, leftControlEl, centerControlEl, rightControlEl] =
  controlEl.children as unknown as [HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement]

export const [timelineEl, filmstripEl, filmstripTimeWrapperEl] =
  timelineWrapperEl.children as unknown as [HTMLDivElement, HTMLDivElement, HTMLDivElement]

export const iconsEl = (() => {
  const svgNS = 'http://www.w3.org/2000/svg'
  const micPath =
    'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'

  return {
    play: createIcon(
      'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z',
    ),

    pause: createIcon(
      ['rect', { x: 6, y: 4, width: 4, height: 16, rx: 1 }],
      ['rect', { x: 14, y: 4, width: 4, height: 16, rx: 1 }],
    ),

    volume: {
      low: createIcon(micPath, 'M16 9a5 5 0 0 1 0 6'),
      high: createIcon(micPath, 'M16 9a5 5 0 0 1 0 6', 'M19.364 18.364a9 9 0 0 0 0-12.728'),
      off: createIcon(
        micPath,
        ['line', { x1: 22, x2: 16, y1: 9, y2: 15 }],
        ['line', { x1: 16, x2: 22, y1: 9, y2: 15 }],
      ),
      mute: createIcon(
        'M16 9a5 5 0 0 1 .95 2.293',
        'M19.364 5.636a9 9 0 0 1 1.889 9.96',
        'm2 2 20 20',
        'm7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11',
        'M9.828 4.172A.686.686 0 0 1 11 4.657v.686',
      ),
    },

    maximize: createIcon('M15 3h6v6', 'm21 3-7 7', 'm3 21 7-7', 'M9 21H3v-6'),

    minimize: createIcon('m14 10 7-7', 'M20 10h-6V4', 'm3 21 7-7', 'M4 14h6v6'),

    speed: createIcon(
      'M15.6 2.7a10 10 0 1 0 5.7 5.7',
      ['circle', { cx: 12, cy: 12, r: 2 }],
      'M13.4 10.6 19 5',
    ),
  }

  type Shape<T extends Record<string, unknown>> = T & {
    'fill'?: string
    'stroke'?: string
    'stroke-width'?: number | string
    'opacity'?: number | string
    'class'?: string
  }

  type ShapeTuple =
    | ['path', Shape<{ d: string; pathLength?: number }>]
    | [
        'rect',
        Shape<{
          x?: number
          y?: number
          width: number
          height: number
          rx?: number
          ry?: number
        }>,
      ]
    | ['circle', Shape<{ cx: number; cy: number; r: number }>]
    | ['ellipse', Shape<{ cx: number; cy: number; rx: number; ry: number }>]
    | ['line', Shape<{ x1: number; y1: number; x2: number; y2: number }>]
    | ['polygon', Shape<{ points: string }>]
    | ['polyline', Shape<{ points: string }>]

  function createIcon(...shapes: (string | ShapeTuple)[]) {
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', '24')
    svg.setAttribute('height', '24')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('class', 'h-6 w-6')

    for (let i = 0; i < shapes.length; i++) {
      const [tagName, attributes] = (
        typeof shapes[i] === 'string' ? ['path', { d: shapes[i] }] : shapes[i]
      ) as ShapeTuple

      const element = document.createElementNS(svgNS, tagName)

      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value.toString())
      })

      svg.appendChild(element)
    }

    return svg
  }
})()
