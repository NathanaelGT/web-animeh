import { transformResult } from '@trpc/server/unstable-core-do-not-import'
import { createWSClient, TRPCClientError } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import SuperJSON from 'superjson'
import { clientProfileIdStore } from '~c/stores'
import { toast, type Toast } from '@/ui/use-toast'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore import TRPCRouter cuma sebagai type untuk TRPC
import type { TRPCRouter } from '~s/router'
import type {
  CreateTRPCReactBase,
  DecoratedQuery,
  DecoratedMutation,
  DecoratedSubscription,
} from '~c/utils/trpc'

let currentToast: ReturnType<typeof toast> | null | undefined
let firstTime = true

const reconnectToWs = () => {
  wsClient.reconnect()
}

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

    addEventListener('focus', reconnectToWs, true)

    let index = 0
    const toastData = () => {
      return {
        title: 'Menghubungkan kembali...',
        description: `Mencoba tersambung kembali dengan server (${++index})`,
        duration: Infinity,
        onOpenChange(open) {
          if (!open) {
            toastInstance.dismiss()
            currentToast = null
          }
        },
      } satisfies Toast
    }

    const toastInstance = (currentToast = toast(toastData()))

    const toastIntervalId = setInterval(() => {
      if (currentToast) {
        toastInstance.update(toastData())
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

    removeEventListener('focus', reconnectToWs, true)

    const toastData = {
      title: 'Terhubung kembali',
      description: 'Koneksi dengan server telah berhasil terhubung kembali',
    } satisfies Toast

    let toastInstance: ReturnType<typeof toast>

    if (currentToast) {
      toastInstance = currentToast

      currentToast.update(toastData)

      currentToast = null
    } else {
      toastInstance = toast(toastData)
    }

    setTimeout(() => {
      toastInstance.dismiss()
    }, 5000)
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

type Api = Omit<typeof api, keyof CreateTRPCReactBase>

type SubscribeHooks<TData> = {
  onData: (data: TData) => void
  onError: (error: TRPCClientError<typeof TRPCRouter>) => void
  onComplete: () => void
}
type Subscription = {
  state: 'open' | 'closed' | 'connecting'
  unsubscribe: () => void
}

type Transform<T> =
  T extends DecoratedQuery<infer Def>
    ? { query(input: Def['input']): Promise<Def['output']> }
    : T extends DecoratedMutation<infer Def>
      ? { mutate(input: Def['input']): Promise<Def['output']> }
      : T extends DecoratedSubscription<infer Def>
        ? { subscribe(input: Def['input'], hooks: SubscribeHooks<Def['output']>): Subscription }
        : T extends object
          ? { [K in keyof T]: Transform<T[K]> }
          : T

export const rpc = new Proxy({} as { path: string }, {
  get(target, prop) {
    if (!target.path) {
      target = { path: '' }
    }

    if (prop === 'query' || prop === 'mutate') {
      return (input: unknown) => {
        return new Promise((resolve, reject) => {
          const unsubscribe = req(
            input,
            prop === 'query' ? prop : 'mutation',
            target.path.slice('.'.length),
            {
              complete() {},
              error: reject,
              next(message) {
                unsubscribe()

                const transformed = transformResult(message, SuperJSON)

                if (transformed.ok) {
                  resolve(transformed.result.data)
                } else {
                  reject(TRPCClientError.from(transformed.error))
                }
              },
            },
          )
        })
      }
    } else if (prop === 'subscribe') {
      return (input: unknown, hooks: SubscribeHooks<unknown>) => {
        const unsubscribe = req(input, 'subscription', target.path.slice('.'.length), {
          complete() {
            subscription.state = 'closed'

            hooks.onComplete?.()
          },
          error: hooks.onError,
          next(message) {
            subscription.state = 'open'

            const transformed = transformResult(message, SuperJSON)

            if (transformed.ok) {
              hooks.onData(transformed.result.data)
            } else {
              hooks.onError(TRPCClientError.from(transformed.error))
            }
          },
        })

        const subscription: Subscription = {
          state: 'connecting',
          unsubscribe,
        }
      }
    }

    target.path += '.' + (typeof prop === 'string' ? prop : prop.toString())

    return new Proxy(target, this)
  },
}) as unknown as Transform<Api>

let reqId = 0

function req<TReqParam extends Parameters<(typeof wsClient)['request']>[0]>(
  input: unknown,
  type: TReqParam['op']['type'],
  path: string,
  callbacks: TReqParam['callbacks'],
) {
  return wsClient.request({
    lastEventId: undefined,
    op: {
      type,
      path,
      id: --reqId,
      input: input === undefined ? '' : SuperJSON.serialize(input),
      context: {},
      signal: null,
    },
    callbacks,
  })
}
