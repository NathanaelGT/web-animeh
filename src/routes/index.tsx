import { useMemo, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { valibotSearchValidator } from '@tanstack/router-valibot-adapter'
import * as v from 'valibot'
import InfiniteScroll from 'react-infinite-scroll-component'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { animeListPages } from '~c/stores'
import { PosterDisplayGroup } from '@/page/home/PosterDisplayGroup'

const searchSchema = v.object({
  terunduh: v.fallback(v.string(), ''),
})

export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: valibotSearchValidator(searchSchema),
  loaderDeps: ({ search }) => search as v.InferOutput<typeof searchSchema>,
  loader: ({ deps }) => fetchRouteData('/', { downloaded: deps.terunduh === 'yoi' }),
})

const perPage = 48

function Index() {
  const id = useMemo(() => Math.random().toString().slice(2), [])
  const routeDeps = Route.useLoaderDeps()
  const animeListQuery = api.route['/'].useInfiniteQuery(
    { x: id, downloaded: routeDeps.terunduh === 'yoi' },
    {
      getNextPageParam: lastPage => lastPage.at(-1)?.id,
      refetchOnMount: false,
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
    <main>
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
        className="grid grid-cols-[repeat(auto-fit,minmax(162px,1fr))] gap-x-4 gap-y-6 px-12 py-10"
      >
        {animeListQuery.data?.pages.map((_, index) => (
          <PosterDisplayGroup key={index} index={index} />
        ))}
      </InfiniteScroll>
    </main>
  )
}
