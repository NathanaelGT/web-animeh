import { videoEl, timelineEl } from '~c/elements'
import { createReactiveDOMRect } from '~c/utils/reactiveRect'
import { clamp } from '~/shared/utils/number'
import { after } from '~/shared/utils/string'
import { controlState } from './setup-player'
import { attachTooltip } from './setup-tooltip'

const [seekerEl, chapterContainerEl, handleEl] = timelineEl.children as unknown as [
  HTMLDivElement,
  HTMLDivElement,
  HTMLDivElement,
]

export { handleEl }

const allTransition = handleEl.style.transition
const widthHeightTransition = after(handleEl.style.transition, ', ')

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

function getScrubTime(event: MouseEvent) {
  const x = event.clientX - timelineRect.left
  const width = timelineRect.width

  return clamp(x / width, 0, 1) * videoEl.duration
}

timelineEl.addEventListener('mousedown', event => {
  isDragging = true

  const newTime = getScrubTime(event)

  videoEl.currentTime = newTime
  timeStartEl.textContent = updateTime(newTime)
  handleEl.classList.add('hover')

  handleEl.style.transition = widthHeightTransition
  updateSeeker(videoEl.currentTime)
})

let lastUpdate = 0
const THROTTLE_MS = 1000 / 24

window.addEventListener('mousemove', event => {
  if (!isDragging) {
    return
  }

  const newTime = getScrubTime(event)

  timeStartEl.textContent = updateTime(newTime)
  updateSeeker(videoEl.currentTime)

  const now = performance.now()
  if (now - lastUpdate > THROTTLE_MS) {
    videoEl.currentTime = newTime
    lastUpdate = now
  }
})

window.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false
    handleEl.classList.remove('hover')
    handleEl.style.transition = allTransition
  }
})

let lastSecond = 0

videoEl.addEventListener('loadedmetadata', () => {
  lastSecond = 0

  timeStartEl.textContent = '0:00'
  timeEndEl.textContent = updateTime(videoEl.duration)
})

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

type Chapter = {
  title: string
  start: number
  end: number
  color: string
}

export function setChapter(chapters: Chapter[]) {
  chapterContainerEl.replaceChildren(
    ...chapters.map(chapter => {
      const el = document.createElement('div')
      el.className = 'absolute top-0 h-full'
      el.style.left = (chapter.start / videoEl.duration) * 100 + '%'
      el.style.width = ((chapter.end - chapter.start) / videoEl.duration) * 100 + '%'
      el.style.backgroundColor = chapter.color

      attachTooltip(el, chapter.title)

      return el
    }),
  )
}
