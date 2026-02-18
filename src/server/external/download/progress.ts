import mitt, { type Emitter } from 'mitt'
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
  | {
      status: 'OTHER'
      progress?: undefined
      text: 'Video selesai diunduh'
      done: true
    }

const download = globalThis as unknown as {
  progress: Emitter<Record<string, DownloadProgressData>>
  progressSnapshot: Map<string, DownloadProgressData>
  sizeMap: Map<string, number>
  progressController: Map<string, AbortController>
}

export const downloadProgress: typeof download.progress = Bun.env.PROD
  ? mitt()
  : (download.progress ??= mitt())

export const downloadProgressSnapshot: typeof download.progressSnapshot = Bun.env.PROD
  ? new Map()
  : (download.progressSnapshot ??= new Map())

export const downloadSizeMap: typeof download.sizeMap = Bun.env.PROD
  ? new Map()
  : (download.sizeMap ??= new Map())

export const downloadProgressController: typeof download.progressController = Bun.env.PROD
  ? new Map()
  : (download.progressController ??= new Map())

downloadProgress.on('*', (key, data) => {
  if (data.done) {
    downloadProgressSnapshot.delete(key)
    downloadMeta.delete(key)
  } else {
    downloadProgressSnapshot.set(key, data)
  }
})
