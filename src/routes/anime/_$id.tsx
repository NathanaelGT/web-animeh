import { createFileRoute, useRouter, Outlet } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'
import { fetchRouteData } from '~c/route'
import { animeDataStore, headerChildStore } from '~c/stores'
import { Image } from '@/Image'

export const Route = createFileRoute('/anime/_$id')({
  component: AnimeIdLayout,
  pendingComponent: Outlet,
  preload: false,
  loader({ params }: { params: { id: string } }) {
    return fetchRouteData('/anime/_$id', { id: Number(params.id) })
  },
})

function AnimeIdLayout() {
  const animeData = Route.useLoaderData()
  const params = Route.useParams()
  const router = useRouter()

  useLayoutEffect(() => {
    return () => {
      router.invalidate()
    }
  }, [params.id])

  useLayoutEffect(() => {
    headerChildStore.setState(() => (
      <div className="fixed -z-50 h-16 overflow-hidden">
        <Image src={animeData.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
    ))

    return () => {
      headerChildStore.setState(() => null)
    }
  }, [router, animeData.id])

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
        <Image src={animeData.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
      <Outlet />
    </>
  )
}
