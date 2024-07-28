import { type ReactNode, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { wsLink } from '@trpc/client'
import SuperJSON from 'superjson'
import { api, getQueryClient, wsClient } from './trpc'

export default function TRPCReactProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() => {
    return api.createClient({
      links: [
        wsLink({
          client: wsClient,
          transformer: SuperJSON,
        }),
      ],
    })
  })

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  )
}
