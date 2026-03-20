export const NOT_DOWNLOADED = { state: 'NOT_DOWNLOADED' } as const

export const DOWNLOADED = { state: 'DOWNLOADED' } as const

export const QUEUED = { state: 'QUEUED' } as const

export const PAUSED = { state: 'PAUSED' } as const

export const DOWNLOADING = (message: string) => ({ state: 'DOWNLOADING', text: message }) as const

import type * as downloadState from './downloadState'

type ReturnTypeOrLiteral<T> = T extends (...args: any[]) => infer R ? R : T

export type DownloadState = ReturnTypeOrLiteral<(typeof downloadState)[keyof typeof downloadState]>
