import { videoEl, timelineWrapperEl, timelineEl } from '~c/elements'
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
import { after } from '~/shared/utils/string'
import { controlState } from './setup-player'

const [seekerEl, chapterContainerEl, handleEl, storyboardWrapperEl] =
  timelineEl.children as unknown as [HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement]

const [storyboardEl, timePreviewEl] = storyboardWrapperEl.children as unknown as [
  HTMLDivElement,
  HTMLDivElement,
]

const seekerColor = 'var(--color-red-600)'
seekerEl.style.backgroundColor = seekerColor

let lastHandleColor = seekerColor
handleEl.style.backgroundColor = lastHandleColor

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
      const el = document.createElement('div')
      el.className = 'absolute top-0 h-full overflow-hidden'
      el.style.left = (chapter.start / videoEl.duration) * 100 + '%'
      el.style.width = ((chapter.end - chapter.start) / videoEl.duration) * 100 + '%'

      const fg = document.createElement('div')
      fg.className = 'w-full h-full absolute inset-0 will-change-transform'
      fg.style.transform = 'translateX(-100%)'
      fg.style.backgroundColor = chapter.color

      const bg = document.createElement('div')
      bg.className = 'w-full h-full absolute inset-0'
      bg.style.backgroundColor = chapter.color
      bg.style.opacity = '0.5'

      el.append(fg, bg)

      chapter.fg = fg
      chapter.bg = bg

      return el
    }),
  )
}

const allTransition = handleEl.style.transition
const widthHeightTransition = after(handleEl.style.transition, ',')

storyboardEl.style.width = STORYBOARD_FRAME_WIDTH + 'px'
storyboardEl.style.height = STORYBOARD_FRAME_HEIGHT + 'px'
storyboardEl.style.backgroundSize = `${STORYBOARD_FRAME_PERFECT_WIDTH * STORYBOARD_GRID_ROWS}px ${STORYBOARD_FRAME_PERFECT_HEIGHT * STORYBOARD_GRID_COLS}px`

const timeSignEl = document.createTextNode('')
const timeStartEl = document.createTextNode('0:00')
const timeEndEl = document.createTextNode('0:00')

export const timeEl = document.createElement('div')
timeEl.className = 'flex items-center gap-1 px-2 py-1'
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

timelineWrapperEl.addEventListener('pointerdown', event => {
  isDragging = true

  const newTime = getScrubTime(event)

  videoEl.currentTime = newTime
  timeStartEl.textContent = updateTime(newTime)
  handleEl.classList.add('hover')

  handleEl.style.transition = widthHeightTransition
  updateSeeker(videoEl.currentTime)

  showStoryboardWrapper()
})

let lastUpdate = 0
const THROTTLE_MS = 1000 / 24

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
    updateStoryboard(event)

    const now = performance.now()
    if (now - lastUpdate > THROTTLE_MS) {
      videoEl.currentTime = newTime
      lastUpdate = now
    }
  })
})

window.addEventListener('pointerup', () => {
  if (isDragging) {
    isDragging = false
    handleEl.classList.remove('hover')
    handleEl.style.transition = allTransition
    storyboardWrapperEl.style.opacity = '0'
  }
})

timelineWrapperEl.addEventListener('pointerenter', showStoryboardWrapper)

let hideTimer: NodeJS.Timeout | null = null
timelineWrapperEl.addEventListener('pointerleave', () => {
  if (isDragging) {
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
timelineWrapperEl.addEventListener('pointermove', event => {
  timelinePointerMoveRaf ||= requestAnimationFrame(() => {
    timelinePointerMoveRaf = 0
    updateStoryboard(event)
  })
})

let lastSecond = 0

videoEl.addEventListener('loadedmetadata', () => {
  lastSecond = 0

  timeStartEl.textContent = '0:00'
  timeEndEl.textContent = updateTime(videoEl.duration)

  applyStoryboardUrl(1)
})

function updateStoryboard(event: PointerEvent) {
  const relX = event.clientX - timelineRect.left
  const percent = clamp(relX / timelineRect.width, 0, 1)

  const hoverTimeSeconds = percent * videoEl.duration
  const absoluteFrameIndex = Math.floor(hoverTimeSeconds * STORYBOARD_FPS)
  const gridIndex = Math.floor(absoluteFrameIndex / STORYBOARD_FRAMES_PER_GRID) + 1

  applyStoryboardUrl(gridIndex)

  const localFrameIndex = absoluteFrameIndex % STORYBOARD_FRAMES_PER_GRID
  const x = localFrameIndex % STORYBOARD_GRID_ROWS
  const y = Math.floor(localFrameIndex / STORYBOARD_GRID_ROWS)
  const posX = x * STORYBOARD_FRAME_PERFECT_WIDTH
  const posY = y * STORYBOARD_FRAME_PERFECT_HEIGHT
  storyboardEl.style.backgroundPosition = `-${posX}px -${posY}px`

  const centeredX = relX - STORYBOARD_FRAME_PERFECT_WIDTH / 2
  const maxX = timelineRect.width - STORYBOARD_FRAME_PERFECT_WIDTH
  storyboardWrapperEl.style.transform = `translateX(${clamp(centeredX, 0, maxX)}px)`

  let timePreview = formatTime(percent * videoEl.duration)
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!

    if (hoverTimeSeconds >= chapter.start && hoverTimeSeconds <= chapter.end) {
      timePreview += ' - ' + chapter.title

      break
    }
  }

  timePreviewEl.textContent = timePreview
}

function applyStoryboardUrl(gridIndex: number) {
  const newUrl =
    'url(' +
    videoEl.src.replace('videos', 'storyboard').slice(0, '.mp4'.length * -1) +
    '_' +
    String(gridIndex).padStart(3, '0') +
    ')'

  if (storyboardEl.style.backgroundImage !== newUrl) {
    storyboardEl.style.backgroundImage = newUrl
  }
}

videoEl.addEventListener('timeupdate', () => {
  if (controlState.isVisible) {
    updateTimeline()
  }
})

export function updateTimeline() {
  const time = videoEl.currentTime
  const second = Math.floor(time)

  if (lastSecond !== second) {
    lastSecond = second
    timeStartEl.textContent = updateTime(second)
  }

  updateSeeker(time)

  let currentColor = seekerColor
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!

    if (second > chapter.end) {
      if (chapter.state !== 1) {
        chapter.state = 1
        chapter.fg.style.transform = 'translateX(0%)'
        chapter.bg.style.opacity = '1'
      }
    } else if (second < chapter.start) {
      if (chapter.state !== 2) {
        chapter.state = 2
        chapter.fg.style.transform = 'translateX(-100%)'
        chapter.bg.style.opacity = '0.5'
      }
    } else {
      const percent = (second - chapter.start) / (chapter.end - chapter.start)

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

function updateTime(seconds: number) {
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

function updateSeeker(currentTime: number) {
  const percentage = currentTime / videoEl.duration || 0

  seekerEl.style.transform = `scaleX(${percentage})`

  const containerWidth = timelineEl.offsetWidth
  const position = percentage * containerWidth

  handleEl.style.transform = `translate(calc(${position}px - var(--x)), calc(-50% - 2px))`
}
