import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { Pending } from '@/Pending'
import { routeTree } from '~/routeTree.gen'

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
    defaultPendingMinMs: 0,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
