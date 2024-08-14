import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import InfiniteScroll from 'react-infinite-scroll-component'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { animeListPages } from '~c/stores'
import { PosterDisplayGroup } from '@/page/home/PosterDisplayGroup'

export const Route = createFileRoute('/')({
  component: Index,
  loader: () => fetchRouteData('/', {}),
})

const perPage = 48

function Index() {
  const animeListQuery = api.route['/'].useInfiniteQuery(
    {},
    {
      getNextPageParam: lastPage => lastPage.at(-1)?.id,
      initialData: {
        pages: [Route.useLoaderData()],
        pageParams: [null],
      },
    },
  )

  useEffect(() => {
    return () => {
      animeListPages.setState(() => null as never)
    }
  }, [])

  animeListPages.setState(() => animeListQuery.data!.pages)

  return (
    <main className="px-12 py-10">
      <InfiniteScroll
        dataLength={
          animeListQuery.data
            ? (animeListQuery.data.pages.length - 1) * perPage +
              animeListQuery.data.pages.at(-1)!.length
            : 0
        }
        next={animeListQuery.fetchNextPage}
        hasMore={animeListQuery.hasNextPage}
        loader={<></>}
        className="grid grid-cols-[repeat(auto-fit,minmax(162px,1fr))] gap-x-4 gap-y-6"
      >
        {animeListQuery.data?.pages.map((_, index) => (
          <PosterDisplayGroup key={index} index={index} />
        ))}
      </InfiniteScroll>
    </main>
  )
}
