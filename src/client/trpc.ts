import { createWSClient } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { clientProfileIdStore } from '~c/stores'
import { toast, type Toast } from '@/ui/use-toast'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore import TRPCRouter cuma sebagai type untuk TRPC
import type { TRPCRouter } from '~s/router'

let currentToast: ReturnType<typeof toast> | null | undefined
let firstTime = true

export const wsClient = createWSClient({
  retryDelayMs: index => Math.min(5000, index * 1000),

  url() {
    // ga langsung ditentukan "http" atau "ws" dari env soalnya bisa jadi protoclnya "https" di prod
    const protocol = location.protocol.replace('http', 'ws')
    const host = import.meta.env.PROD ? location.host : 'localhost:8887'

    return `${protocol}//${host}/$INJECT_VERSION$&${clientProfileIdStore.state ?? ''}`
  },

  onClose(cause) {
    if (cause?.code === 4000) {
      location.reload()

      return
    }

    let index = 0
    const toastData = () => {
      return {
        title: 'Menghubungkan kembali...',
        description: `Mencoba tersambung kembali dengan server (${++index})`,
        duration: Infinity,
        onOpenChange(open) {
          if (!open) {
            toastObj.dismiss()
            currentToast = null
          }
        },
      } satisfies Toast
    }

    const toastObj = (currentToast = toast(toastData()))

    const toastIntervalId = setInterval(() => {
      if (currentToast) {
        toastObj.update(toastData())
      } else {
        clearInterval(toastIntervalId)
      }
    }, 1000)
  },

  onOpen() {
    if (firstTime) {
      firstTime = false

      return
    }

    const toastData = {
      title: 'Terhubung kembali',
      description: 'Koneksi dengan server telah berhasil terhubung kembali',
      duration: 5000,
    } satisfies Toast

    if (currentToast) {
      currentToast.update(toastData)

      currentToast = null
    } else {
      toast(toastData)
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
