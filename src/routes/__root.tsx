import React, { useEffect } from 'react'
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
import { Header } from '@/Header'

const TanStackRouterDevtools = import.meta.env.PROD
  ? null
  : React.lazy(async () => {
      const res = await import('@tanstack/router-devtools')

      return { default: res.TanStackRouterDevtools }
    })

export const Route = createRootRoute({
  component: function Component() {
    const router = useRouter()

    useEffect(() => {
      const handler = () => {
        void router.invalidate()
      }

      window.addEventListener('focus', handler)

      return () => {
        window.removeEventListener('focus', handler)
      }
    })

    return (
      <div className="flex min-h-screen flex-col">
        <Header />

        <Outlet />

        {TanStackRouterDevtools && <TanStackRouterDevtools />}
      </div>
    )
  },
})
