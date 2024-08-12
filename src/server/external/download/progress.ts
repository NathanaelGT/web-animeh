import mitt from 'mitt'

export const downloadProgress = mitt<Record<string, { text: string; done?: boolean }>>()

export const downloadProgressSnapshot = new Map<string, { text: string; done?: boolean }>()

downloadProgress.on('*', (key, data) => {
  if (data.done) {
    downloadProgressSnapshot.delete(key)
  } else {
    downloadProgressSnapshot.set(key, data)
  }
})
