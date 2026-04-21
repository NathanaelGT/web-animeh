import { videoEl } from '~c/elements'

export const iframes = new Map() as Map<string, number[]> & {
  current: number[] | null
}
iframes.current = null

export const iframePromises = new Map<string, Promise<number[]>>()

videoEl.addEventListener('loadedmetadata', async () => {
  if (iframePromises.has(videoEl.src)) {
    return
  }

  if (!videoEl.src.startsWith(origin)) {
    return
  }

  const { src } = videoEl
  const promise = fetch(src.replace('videos', 'iframe').slice(0, '.mp4'.length * -1))
    .then(response => response.text())
    .then(text => text.split(',').map(Number))

  iframePromises.set(src, promise)

  const data = await promise
  if (videoEl.src === src) {
    iframes.current = data
    iframes.set(src, data)
  }

  iframePromises.delete(src)
})
