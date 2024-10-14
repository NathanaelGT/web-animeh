import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { routeTree } from '~/routeTree.gen'
import { Pending } from '@/Pending'

export const createRouter = () => {
  return createTanstackRouter({
    routeTree,
    // defaultViewTransition: true,
    defaultPreload: 'intent',
    defaultPreloadDelay: 60_000,
    defaultPreloadStaleTime: 10_000,
    defaultStaleTime: Infinity,
    defaultGcTime: 0,
    defaultPendingComponent: Pending,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
