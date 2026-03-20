import { createFileRoute } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { GenreSection } from '@/page/pengaturan/filter/Genre'
import { RatingSection } from '@/page/pengaturan/filter/Rating'

export const Route = createFileRoute('/_pengaturan/pengaturan/filter')({
  component: PengaturanKeybind,
  pendingComponent: () => <p>Sedang memuat...</p>,
  loader: () => fetchRouteData('/pengaturan/filter'),
})

function PengaturanKeybind() {
  const { genres } = Route.useLoaderData()

  return (
    <div className="space-y-4 py-2 pb-4">
      <RatingSection />

      <GenreSection genres={genres} />
    </div>
  )
}
