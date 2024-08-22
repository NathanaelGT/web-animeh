import React, { useEffect } from 'react'
import { clientProfileSettingsStore } from '~c/stores'
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
    useEffect(() => {
      const rootClassList = document.documentElement.classList
      let theme = clientProfileSettingsStore.state.theme

      const updateTheme = (newTheme: typeof theme) => {
        if (newTheme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'

          rootClassList.add(systemTheme)
        } else {
          rootClassList.add(newTheme)
        }
      }

      updateTheme(theme)

      return clientProfileSettingsStore.subscribe(() => {
        const newTheme = clientProfileSettingsStore.state.theme
        if (newTheme !== theme) {
          theme = newTheme

          rootClassList.remove('dark', 'light')
          updateTheme(theme)
        }
      })
    }, [])

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
