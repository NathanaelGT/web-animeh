import { videoEl } from '~c/elements'

export const iframes = new Map<string, number[]>()

export const iframePromises = new Map<string, Promise<number[]>>()

videoEl.addEventListener('loadedmetadata', async () => {
  if (!videoEl.src.startsWith(origin) || iframePromises.has(videoEl.src)) {
    return
  }

  const promise = fetch(videoEl.src.replace('videos', 'iframe').slice(0, '.mp4'.length * -1))
    .then(response => response.text())
    .then(text => text.split(',').map(Number))

  iframePromises.set(videoEl.src, promise)

  iframes.set(videoEl.src, await promise)

  iframePromises.delete(videoEl.src)
})
