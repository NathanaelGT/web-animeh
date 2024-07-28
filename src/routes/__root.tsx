import React, { useEffect } from 'react'
import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'

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
      <>
        <div className="flex gap-2 p-2">
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>
        </div>
        <hr />
        <Outlet />
        {TanStackRouterDevtools && <TanStackRouterDevtools />}
      </>
    )
  },
})
