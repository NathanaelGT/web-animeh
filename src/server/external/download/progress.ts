import mitt from 'mitt'
import { downloadMeta } from './meta'

export type DownloadProgressData = {
  text: string
  done?: boolean
}

export const downloadProgress = mitt<Record<string, DownloadProgressData>>()

export const downloadProgressSnapshot = new Map<string, DownloadProgressData>()

export const downloadProgressController = new Map<string, AbortController>()

downloadProgress.on('*', (key, data) => {
  if (data.done) {
    downloadProgressSnapshot.delete(key)
    downloadMeta.delete(key)
  } else {
    downloadProgressSnapshot.set(key, data)
  }
})
