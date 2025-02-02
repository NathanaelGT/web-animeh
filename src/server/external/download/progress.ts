import mitt from 'mitt'
import { downloadMeta } from './meta'

export type DownloadProgress = {
  speed: number
  receivedLength: number
  totalLength: number | null
}

export type OptimizingProgress = {
  percent: number
}

export type DownloadProgressData =
  | {
      status: 'DOWNLOADING'
      progress: DownloadProgress
      text?: string
      done?: undefined
    }
  | {
      status: 'OPTIMIZING'
      progress: OptimizingProgress
      text?: undefined
      done?: undefined
    }
  | {
      status: 'OTHER'
      progress?: undefined
      text: string
      done?: true
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
