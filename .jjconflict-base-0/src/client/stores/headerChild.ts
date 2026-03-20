import { Store } from '@tanstack/store'
import type { ReactElement } from 'react'

export const headerChildStore = new Store<ReactElement | null>(null)
