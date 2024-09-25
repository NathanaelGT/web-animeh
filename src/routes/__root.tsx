import React, { useLayoutEffect } from 'react'
import { clientProfileSettingsStore, showKeybindTipsStore } from '~c/stores'
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
import { createKeybindHandler } from '~c/utils/eventHandler'
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
    useLayoutEffect(() => {
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

      const unsubscribeSettingsStore = clientProfileSettingsStore.subscribe(() => {
        const newTheme = clientProfileSettingsStore.state.theme
        if (newTheme !== theme) {
          theme = newTheme

          rootClassList.remove('dark', 'light')
          updateTheme(theme)
        }
      })

      const removeKeybindHandler = createKeybindHandler('global', 'showKeybindTips', event => {
        showKeybindTipsStore.setState(() => true)

        const element = event.currentTarget || document.body
        element.addEventListener(
          'keyup',
          () => {
            showKeybindTipsStore.setState(() => false)
          },
          { once: true },
        )
      })

      return () => {
        unsubscribeSettingsStore()
        removeKeybindHandler()
      }
    }, [])

    return (
      <div className="flex min-h-screen flex-col">
        <Header />

        <ScrollToTop />
        <Outlet />

        <Toaster />

        {TanStackRouterDevtools && <TanStackRouterDevtools />}
      </div>
    )
  },
})

function ScrollToTop(): undefined {
  const router = useRouter()

  useLayoutEffect(() => {
    return router.subscribe('onLoad', () => {
      scrollTo(0, 0)
    })
  }, [router])
}
