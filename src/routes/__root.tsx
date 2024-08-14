import React from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/Header'
import { Toaster } from '@/ui/toaster'

const TanStackRouterDevtools = import.meta.env.PROD
  ? null
  : React.lazy(async () => {
      const res = await import('@tanstack/router-devtools')

      return { default: res.TanStackRouterDevtools }
    })

export const Route = createRootRoute({
  component: function Component() {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />

        <Outlet />

        <Toaster />

        {TanStackRouterDevtools && <TanStackRouterDevtools />}
      </div>
    )
  },
})
