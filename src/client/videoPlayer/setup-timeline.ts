import {
  videoEl,
  timelineWrapperEl,
  timelineEl,
  filmstripEl,
  filmstripTimeWrapperEl,
  leftControlEl,
  rightControlEl,
  centerControlEl,
} from '~c/elements'
import { createElement } from '~c/utils/dom'
import { createReactiveDOMRect } from '~c/utils/reactiveRect'
import {
  STORYBOARD_FRAME_WIDTH,
  STORYBOARD_FRAME_HEIGHT,
  STORYBOARD_FRAME_PERFECT_WIDTH,
  STORYBOARD_FRAME_PERFECT_HEIGHT,
  STORYBOARD_GRID_ROWS,
  STORYBOARD_GRID_COLS,
  STORYBOARD_FPS,
  STORYBOARD_FRAMES_PER_GRID,
} from '~/shared/storyboard'
import { clamp } from '~/shared/utils/number'
import { controlState, addPlayerListeners, removePlayerListeners } from './setup-player'

const [seekerEl, chapterContainerEl, handleEl, storyboardWrapperEl] =
  timelineEl.children as unknown as [HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement]

export { handleEl }

const [, storyboardEl, timePreviewEl] = storyboardWrapperEl.children as unknown as [
  HTMLDivElement,
  HTMLDivElement,
  HTMLDivElement,
]

const [filmstripTimeEl] = filmstripTimeWrapperEl.children as unknown as [HTMLDivElement]

timelineWrapperEl.style.top = '-12px'

const seekerColor = 'var(--color-red-600)'
seekerEl.style.backgroundColor = seekerColor

let lastHandleColor = seekerColor
handleEl.style.backgroundColor = lastHandleColor

let idealWindowFrameCount = 0
let windowFrameCenter = 0

let filmstripOffset = 0
const windowFrames: [HTMLDivElement, isVisible?: boolean][] = []

const filmstripObserver = new ResizeObserver(entries => {
  const entry = entries[0]!

  const { width } = entry.contentRect
  if (!width) {
    return
  }

  // -2 dari setengah widthnya filmstripTimeWrapperEl
  filmstripOffset = (Math.round(width / 2) % STORYBOARD_FRAME_WIDTH) - 2

  const newIdealWindowFrameCount = Math.ceil(width / 240)
  if (idealWindowFrameCount === newIdealWindowFrameCount) {
    return
  }

  idealWindowFrameCount = newIdealWindowFrameCount
  windowFrameCenter = Math.floor(idealWindowFrameCount / 2)

  const newCount = idealWindowFrameCount + 2

  while (windowFrames.length < newCount) {
    const el = createElement('bg-no-repeat flex-none')

    el.style.width = STORYBOARD_FRAME_WIDTH + 'px'
    el.style.height = STORYBOARD_FRAME_HEIGHT + 'px'
    el.style.backgroundSize = `${STORYBOARD_FRAME_PERFECT_WIDTH * STORYBOARD_GRID_ROWS}px ${STORYBOARD_FRAME_PERFECT_HEIGHT * STORYBOARD_GRID_COLS}px`

    windowFrames.push([el])
    filmstripEl.append(el)
  }
  while (windowFrames.length > newCount) {
    const [el] = windowFrames.pop()!
    filmstripEl.removeChild(el)
  }
})

filmstripObserver.observe(filmstripEl)

window.addEventListener('resize', disableFineScrubbing)

type Chapter = {
  title: string
  start: number
  end: number
  color: string
}

type InternalChapter = Chapter & {
  fg: HTMLDivElement
  bg: HTMLDivElement
  state?: 1 | 2 | 3
}

let chapters: InternalChapter[] = []
export function setChapter(newChapters: Chapter[]) {
  chapters = newChapters as InternalChapter[]

  chapterContainerEl.replaceChildren(
    ...chapters.map(chapter => {
      const el = createElement('absolute top-0 h-full overflow-hidden')
      el.style.left = (chapter.start / videoEl.duration) * 100 + '%'
      el.style.width = ((chapter.end - chapter.start) / videoEl.duration) * 100 + '%'

      const fg = createElement('w-full h-full absolute inset-0 will-change-transform')
      fg.style.transform = 'translateX(-100%)'
      fg.style.backgroundColor = chapter.color

      const bg = createElement('w-full h-full absolute inset-0')
      bg.style.backgroundColor = chapter.color
      bg.style.opacity = '0.5'

      el.append(fg, bg)

      chapter.fg = fg
      chapter.bg = bg

      return el
    }),
  )
}

storyboardEl.style.width = STORYBOARD_FRAME_WIDTH + 'px'
storyboardEl.style.height = STORYBOARD_FRAME_HEIGHT + 'px'
storyboardEl.style.backgroundSize = `${STORYBOARD_FRAME_PERFECT_WIDTH * STORYBOARD_GRID_ROWS}px ${STORYBOARD_FRAME_PERFECT_HEIGHT * STORYBOARD_GRID_COLS}px`

const timeSignEl = document.createTextNode('')
export const timeStartEl = document.createTextNode('0:00')
export const timeEndEl = document.createTextNode('0:00')

export const timeEl = createElement('flex items-center gap-1 px-2 py-1')
timeEl.append(timeSignEl, timeStartEl, ' / ', timeEndEl)

timeEl.addEventListener('click', () => {
  const isNegative = timeSignEl.textContent === '-'

  if (isNegative) {
    timeSignEl.textContent = ''
  } else {
    timeSignEl.textContent = '-'
  }

  timeStartEl.textContent = updateTime(videoEl.currentTime)
})

let isDragging = false

const timelineRect = createReactiveDOMRect(timelineEl)

function getScrubTime(event: PointerEvent) {
  const x = event.clientX - timelineRect.left
  const width = timelineRect.width

  return clamp(x / width, 0, 1) * videoEl.duration
}

timelineEl.addEventListener('pointerdown', event => {
  isDragging = true

  const newTime = getScrubTime(event)

  videoEl.currentTime = newTime
  timeStartEl.textContent = updateTime(newTime)
  handleEl.classList.add('hover')

  updateSeeker(newTime)

  showStoryboardWrapper()
})

let lastUpdate = 0
const THROTTLE_MS = 1000 / 24

function handleVideoPlayWhenFineScrubbing() {
  videoEl.removeEventListener('play', handleVideoPlayWhenFineScrubbing)
  window.removeEventListener('keydown', handleWindowKeyDownHandlerWhenFineScrubbing)

  disableFineScrubbing()

  isDragging = false
}

function handleWindowKeyDownHandlerWhenFineScrubbing(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleVideoPlayWhenFineScrubbing()
    videoEl.play()
  }
}

function enableFineScrubbing() {
  controlState.isFineScrubbing = true

  removePlayerListeners()
  removeTimelineListeners()

  filmstripEl.classList.replace('hidden', 'flex')
  filmstripTimeWrapperEl.classList.remove('hidden')

  leftControlEl.style.transform = 'translateY(100%)'
  centerControlEl.style.transform = 'translateY(100%)'
  rightControlEl.style.transform = 'translateY(100%)'

  requestAnimationFrame(() => {
    videoEl.style.filter = 'brightness(.6)'
    timelineWrapperEl.style.transform = 'translateY(calc(-100% + var(--spacing) * 14 + 18px))'
    filmstripEl.style.opacity = '1'
    filmstripTimeWrapperEl.style.opacity = '1'
    storyboardWrapperEl.style.opacity = '0'
    videoEl.pause()

    window.addEventListener('keydown', handleWindowKeyDownHandlerWhenFineScrubbing)
    videoEl.addEventListener('play', handleVideoPlayWhenFineScrubbing)
  })
}

function disableFineScrubbing() {
  controlState.isFineScrubbing = false
  isDragging = false

  addPlayerListeners()
  addTimelineListeners()

  leftControlEl.style.transform = 'none'
  centerControlEl.style.transform = 'none'
  rightControlEl.style.transform = 'none'
  videoEl.style.filter = 'none'
  timelineWrapperEl.style.transform = 'translateY(0)'
  filmstripEl.style.opacity = '0'
  filmstripTimeWrapperEl.style.opacity = '0'

  filmstripEl.ontransitionend = event => {
    if (event.propertyName === 'opacity' && filmstripEl.style.opacity === '0') {
      filmstripEl.ontransitionend = null
      filmstripEl.classList.replace('flex', 'hidden')
    }
  }
  filmstripTimeWrapperEl.ontransitionend = event => {
    if (event.propertyName === 'opacity' && filmstripEl.style.opacity === '0') {
      filmstripTimeWrapperEl.ontransitionend = null
      filmstripTimeWrapperEl.classList.add('hidden')
    }
  }
}

let windowPointerMoveRaf = 0
window.addEventListener('pointermove', event => {
  if (!isDragging) {
    return
  }

  windowPointerMoveRaf ||= requestAnimationFrame(() => {
    windowPointerMoveRaf = 0

    const newTime = getScrubTime(event)

    timeStartEl.textContent = updateTime(newTime)
    updateSeeker(videoEl.currentTime)

    const now = performance.now()
    if (now - lastUpdate > THROTTLE_MS) {
      videoEl.currentTime = newTime
      lastUpdate = now
    }

    if (event.y - timelineRect.y < -32) {
      if (!controlState.isFineScrubbing) {
        enableFineScrubbing()
      }

      updateFineScrubbing(event)
    } else if (controlState.isFineScrubbing) {
      disableFineScrubbing()

      storyboardWrapperEl.style.opacity = '1'

      updateStoryboard(event)
    }
  })
})

window.addEventListener('pointerup', () => {
  if (isDragging && !controlState.isFineScrubbing) {
    isDragging = false
    handleEl.classList.remove('hover')
    storyboardWrapperEl.style.opacity = '0'
  }
})

function handleTimelinePointerEnter() {
  showStoryboardWrapper()
}

let hideTimer: NodeJS.Timeout | null = null
timelineEl.addEventListener('pointerleave', () => {
  if (isDragging || controlState.isFineScrubbing) {
    return
  }

  hideTimer ??= setTimeout(() => {
    hideTimer = null
    storyboardWrapperEl.style.opacity = '0'
  }, 150)
})

function showStoryboardWrapper() {
  storyboardWrapperEl.classList.replace('hidden', 'flex')
  storyboardWrapperEl.style.opacity = '1'
}

storyboardWrapperEl.addEventListener('transitionend', () => {
  if (storyboardWrapperEl.style.opacity === '0') {
    storyboardEl.classList.replace('flex', 'hidden')
  }
})

let timelinePointerMoveRaf = 0
function handleTimelinePointerMove(event: PointerEvent) {
  timelinePointerMoveRaf ||= requestAnimationFrame(() => {
    timelinePointerMoveRaf = 0
    updateStoryboard(event)
  })
}

export function addTimelineListeners() {
  timelineEl.addEventListener('pointerenter', handleTimelinePointerEnter)
  timelineEl.addEventListener('pointermove', handleTimelinePointerMove)
}

export function removeTimelineListeners() {
  timelineEl.removeEventListener('pointerenter', handleTimelinePointerEnter)
  timelineEl.removeEventListener('pointermove', handleTimelinePointerMove)
}

addTimelineListeners()

let lastSecond = 0

videoEl.addEventListener('loadedmetadata', () => {
  lastSecond = 0

  timeEndEl.textContent = updateTime(videoEl.duration)

  applyStoryboardUrl(1)
})

function updateStoryboard(event: PointerEvent) {
  const time = getScrubTime(event)

  setStoryboardPreview(Math.floor(time * STORYBOARD_FPS), storyboardEl)

  const centeredX = event.clientX - timelineRect.left - STORYBOARD_FRAME_PERFECT_WIDTH / 2
  const maxX = timelineRect.width - STORYBOARD_FRAME_PERFECT_WIDTH
  storyboardWrapperEl.style.transform = `translateX(${clamp(centeredX, 0, maxX)}px)`

  let timePreview = formatTime(time)
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!

    if (time >= chapter.start && time <= chapter.end) {
      timePreview += ' - ' + chapter.title

      break
    }
  }

  timePreviewEl.textContent = timePreview
}

function setStoryboardPreview(absoluteFrameIndex: number, el: HTMLDivElement) {
  const gridIndex = Math.floor(absoluteFrameIndex / STORYBOARD_FRAMES_PER_GRID) + 1
  applyStoryboardUrl(gridIndex, el)

  const localFrameIndex = absoluteFrameIndex % STORYBOARD_FRAMES_PER_GRID
  const x = localFrameIndex % STORYBOARD_GRID_ROWS
  const y = Math.floor(localFrameIndex / STORYBOARD_GRID_ROWS)
  const posX = x * STORYBOARD_FRAME_PERFECT_WIDTH
  const posY = y * STORYBOARD_FRAME_PERFECT_HEIGHT
  el.style.backgroundPosition = `-${posX}px -${posY}px`
}

function updateFineScrubbing(event: PointerEvent) {
  const time = getScrubTime(event)
  const frameCount = videoEl.duration * STORYBOARD_FPS
  const frame = clamp(time * STORYBOARD_FPS, 0, frameCount)
  const baseFrame = Math.floor(frame)
  const fraction = frame - baseFrame

  const shiftX = -(fraction * STORYBOARD_FRAME_WIDTH) + filmstripOffset
  filmstripEl.style.transform = `translateX(${shiftX}px)`

  const startFrame = baseFrame - windowFrameCenter

  windowFrames.forEach((frame, i) => {
    const frameToLoad = startFrame + i
    const [el] = frame

    if (frameToLoad < 0 || frameToLoad >= frameCount) {
      if (frame[1]) {
        frame[1] = false
        el.style.opacity = '0'
      }

      return
    }
    if (!frame[1]) {
      frame[1] = true
      el.style.opacity = '1'
    }

    setStoryboardPreview(frameToLoad, el)
  })

  filmstripTimeEl.textContent = formatTime(time)
}

function applyStoryboardUrl(gridIndex: number, el = storyboardEl) {
  const newUrl =
    'url(' +
    videoEl.src.replace('videos', 'storyboard').slice(0, '.mp4'.length * -1) +
    '_' +
    String(gridIndex).padStart(3, '0') +
    ')'

  if (el.style.backgroundImage !== newUrl) {
    el.style.backgroundImage = newUrl
  }
}

videoEl.addEventListener('timeupdate', () => {
  if (controlState.isVisible) {
    updateTimeline()
  }
})

export function updateTimeline(time = videoEl.currentTime) {
  const second = Math.floor(time)

  if (lastSecond !== second) {
    lastSecond = second
    timeStartEl.textContent = updateTime(second)
  }

  updateSeeker(time)
}

export function updateTime(seconds: number) {
  if (timeSignEl.textContent === '-') {
    return formatTime(videoEl.duration - seconds)
  }

  return formatTime(seconds)
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return minutes + ':' + remainingSeconds.toString().padStart(2, '0')
}

export function updateSeeker(currentTime: number) {
  const percentage = currentTime / videoEl.duration || 0

  seekerEl.style.transform = `scaleX(${percentage})`
  handleEl.style.transform = `translate(calc(${percentage * 100}cqw - var(--x)), calc(-50% - 2px))`

  let currentColor = seekerColor
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!

    if (currentTime > chapter.end) {
      if (chapter.state !== 1) {
        chapter.state = 1
        chapter.fg.style.transform = 'translateX(0%)'
        chapter.bg.style.opacity = '1'
      }
    } else if (currentTime < chapter.start) {
      if (chapter.state !== 2) {
        chapter.state = 2
        chapter.fg.style.transform = 'translateX(-100%)'
        chapter.bg.style.opacity = '0.5'
      }
    } else {
      const percent = (currentTime - chapter.start) / (chapter.end - chapter.start)

      chapter.fg.style.transform = `translateX(-${100 - percent * 100}%)`

      if (chapter.state !== 3) {
        chapter.state = 3
        chapter.bg.style.opacity = '0.5'
      }

      currentColor = chapter.color
    }
  }

  if (lastHandleColor !== currentColor) {
    lastHandleColor = currentColor
    handleEl.style.backgroundColor = currentColor
  }
}
