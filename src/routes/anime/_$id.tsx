import { useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { AnimeDataContext } from '~c/context'
import { Image } from '@/Image'
import { headerChildStore } from '~c/stores'

let latestAnimeId = ''

export const Route = createFileRoute('/anime/_$id')({
  component: AnimeIdLayout,
  async loader({ params }: { params: { id: string } }) {
    try {
      return await fetchRouteData('/anime/_$id', Number(params.id))
    } finally {
      latestAnimeId = params.id
    }
  },
  shouldReload: match => match.params.id !== latestAnimeId,
})

function AnimeIdLayout() {
  const animeData = Route.useLoaderData()
  const params = Route.useParams()

  useEffect(() => {
    headerChildStore.setState(() => (
      <div className="fixed -z-50 h-16 overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
    ))

    return () => {
      headerChildStore.setState(() => null)
    }
  }, [params.id])

  return (
    <>
      <div className="fixed -z-50 h-auto overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
      <AnimeDataContext.Provider value={animeData}>
        <Outlet />
      </AnimeDataContext.Provider>
    </>
  )
}
