import type { Observer } from '@trpc/server/observable'

export type ImageEmitterParam = [path: string, base64: string, mimeType?: string][] | string[]

export type ImageEmitter = Observer<ImageEmitterParam, unknown>

export const pendingImageEmitterMap = new Map<string, Promise<ImageEmitter>>()

export const imageEmitterMap = new Map<string, ImageEmitter>()
