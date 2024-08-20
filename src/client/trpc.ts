import { createWSClient } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { clientProfileIdStore } from '~c/stores'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore import TRPCRouter cuma sebagai type untuk TRPC
import type { TRPCRouter } from '~s/router'

export const wsClient = createWSClient({
  retryDelayMs() {
    return 0
  },

  url() {
    const port = import.meta.env.PROD ? 8888 : 8887

    return `ws://localhost:${port}/$INJECT_VERSION$&${clientProfileIdStore.state ?? ''}`
  },

  onClose(cause) {
    if (cause?.code === 4000) {
      location.reload()
    }
  },
})

const createQueryClient = () => new QueryClient()

let clientQueryClientSingleton: QueryClient | undefined
export const getQueryClient = () => {
  if (import.meta.env.SSR) {
    // Server: always make a new query client
    return createQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient())
}

export const api = createTRPCReact<typeof TRPCRouter>()
