import { useMemo, useEffect } from 'react'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { Image } from '@/Image'
import { animeDataStore, headerChildStore } from '~c/stores'

let latestAnimeId = ''
let latestRef: number | undefined

export const Route = createFileRoute('/anime/_$id')({
  component: AnimeIdLayout,
  async loader({ params }: { params: { id: string } }) {
    try {
      return await fetchRouteData('/anime/_$id', { id: Number(params.id), ref: latestRef })
    } finally {
      latestAnimeId = params.id
    }
  },
  shouldReload: match => match.params.id !== latestAnimeId,
})

function AnimeIdLayout() {
  const [animeData, ref] = Route.useLoaderData()
  const params = Route.useParams()
  const router = useRouter()

  useMemo(() => {
    latestRef = ref

    if (ref) {
      router.invalidate()
    }
  }, [ref])

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

  animeDataStore.setState(() => animeData)

  return (
    <>
      <div className="fixed -z-50 h-auto overflow-hidden">
        <Image src={params.id} className="h-screen w-screen opacity-40 blur-xl" />
      </div>
      <Outlet />
    </>
  )
}
