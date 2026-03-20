import { createFileRoute, Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from '~c/utils'
import { buttonVariants } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { kebabCaseToTitleCase } from '~/shared/utils/string'

export const Route = createFileRoute('/_pengaturan')({
  component: PengaturanLayout,
})

function PengaturanLayout() {
  const router = useRouter()
  const [settingPages] = useState(() => {
    return Object.keys(router.routesByPath)
      .filter(path => path.startsWith('/pengaturan'))
      .reverse()
      .map(path => {
        const title = kebabCaseToTitleCase(path.slice('/pengaturan/'.length) || 'Umum')

        return { title, path }
      })
  })

  const currentPath = useRouterState({
    select: state => state.location.pathname,
  })

  return (
    <div className="space-y-6 p-10 pb-16">
      <div className="space-y-0.5">
        <p className="text-2xl font-bold tracking-tight">Pengaturan</p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col gap-y-8 lg:flex-row lg:gap-x-12 lg:gap-y-0">
        <aside className="relative -mx-4 lg:w-1/5">
          <nav
            data-subs-header="top-20!"
            className="sticky top-4 flex gap-x-2 overflow-x-auto transition-[top] lg:flex-col lg:gap-x-0 lg:gap-y-1"
          >
            {settingPages.map(page => (
              <Link
                key={page.path}
                to={page.path}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  currentPath === page.path
                    ? 'bg-muted hover:bg-muted'
                    : 'hover:bg-transparent hover:underline',
                  'justify-start',
                )}
              >
                {page.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
