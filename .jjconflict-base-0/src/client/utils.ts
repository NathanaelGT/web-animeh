import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const isTouchDevice = matchMedia('(pointer:coarse)').matches

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export * from './utils/base64ToBlob'
export * from './utils/logger'
