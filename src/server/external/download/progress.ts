import mitt from 'mitt'

export type DownloadProgressData = {
  text: string
  done?: boolean
}

export const downloadProgress = mitt<Record<string, DownloadProgressData>>()

export const downloadProgressSnapshot = new Map<string, DownloadProgressData>()

downloadProgress.on('*', (key, data) => {
  if (data.done) {
    downloadProgressSnapshot.delete(key)
  } else {
    downloadProgressSnapshot.set(key, data)
  }
})