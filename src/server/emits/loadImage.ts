import type { Observer } from '@trpc/server/observable'

export type ImageType = [path: string, base64: string] | [path: string]

export type ImageEmitter = Observer<ImageType, unknown>

export const pendingImageEmitterMap = new Map<string, Promise<ImageEmitter>>()

export const imageEmitterMap = new Map<string, ImageEmitter>()
