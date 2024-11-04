import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_pengaturan/pengaturan/unduhan')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="py-2 pb-4 lg:max-w-2xl">
      <div className="grid gap-y-6">
        <h2 className="text-lg font-bold">Daftar Unduhan</h2>

        <Outlet />
      </div>
    </div>
  )
}
