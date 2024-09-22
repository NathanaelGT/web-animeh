import { useLayoutEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { Image } from '@/Image'
import { animeDataStore, headerChildStore } from '~c/stores'

let latestAnimeId = ''

export const Route = createFileRoute('/anime/_$id')({
  component: AnimeIdLayout,
  async loader({ params }: { params: { id: string } }) {
    try {
      return await fetchRouteData('/anime/_$id', { id: Number(params.id) })
    } finally {
      latestAnimeId = params.id
    }
  },
  shouldReload: match => match.params.id !== latestAnimeId,
})

function AnimeIdLayout() {
  const animeData = Route.useLoaderData()
  const params = Route.useParams()

  useLayoutEffect(() => {
    headerChildStore.setState(() => (
      <div className="fixed -z-50 h-16 overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
    ))

    return () => {
      headerChildStore.setState(() => null)
    }
  }, [params.id])

  useLayoutEffect(() => {
    animeDataStore.setState(() => animeData)

    return () => {
      animeDataStore.setState(() => null as never)
    }
  }, [animeData])

  // pas pertama render, animeDataStore bakal null
  // useLayoutEffect baru kejalan setelah initial render
  if (animeDataStore.state === null) {
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
