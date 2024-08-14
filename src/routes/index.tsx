import { createFileRoute } from '@tanstack/react-router'
import InfiniteScroll from 'react-infinite-scroll-component'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
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
        {animeListQuery.data?.pages.map((page, index) => (
          <PosterDisplayGroup key={index} animeList={page} />
        ))}
      </InfiniteScroll>
    </main>
  )
}
