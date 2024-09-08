import { useState } from 'react'
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { cn } from '~c/utils'
import { kebabCaseToTitleCase } from '~/shared/utils/string'
import { Separator } from '@/ui/separator'
import { buttonVariants } from '@/ui/button'

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
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
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
