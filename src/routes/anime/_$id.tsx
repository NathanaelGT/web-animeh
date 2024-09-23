import { useLayoutEffect } from 'react'
import { createFileRoute, useRouter, Outlet } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { Image } from '@/Image'
import { animeDataStore, headerChildStore } from '~c/stores'

export const Route = createFileRoute('/anime/_$id')({
  component: AnimeIdLayout,
  loader({ params }: { params: { id: string } }) {
    return fetchRouteData('/anime/_$id', { id: Number(params.id) })
  },
})

function AnimeIdLayout() {
  const animeData = Route.useLoaderData()
  const params = Route.useParams()
  const router = useRouter()

  useLayoutEffect(() => {
    headerChildStore.setState(() => (
      <div className="fixed -z-50 h-16 overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
    ))

    return () => {
      router.invalidate()
      headerChildStore.setState(() => null)
    }
  }, [router, params.id])

  useLayoutEffect(() => {
    animeDataStore.setState(() => animeData)

    return () => {
      animeDataStore.setState(() => null as never)
    }
  }, [animeData])

  // pas pertama render, animeDataStore bakal null
  // useLayoutEffect baru kejalan setelah initial render
  if (animeDataStore.state === null || animeDataStore.state?.id !== animeData.id) {
    animeDataStore.setState(() => animeData)
  }

  return (
    <>
      <div className="fixed -z-50 h-auto overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
      <Outlet />
    </>
  )
}
