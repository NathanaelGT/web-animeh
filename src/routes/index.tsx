import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { valibotSearchValidator } from '@tanstack/router-valibot-adapter'
import * as v from 'valibot'
import InfiniteScroll from 'react-infinite-scroll-component'
import { scrollbarWidth } from '~c/main'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { animeListPages } from '~c/stores'
import { oneRemInPx } from '~c/utils/css'
import { PosterDisplayGroup } from '@/page/home/PosterDisplayGroup'
import type { TRPCParams } from '~/shared/utils/types'

const searchSchema = v.object({
  terunduh: v.optional(v.string(), undefined),
})

export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: valibotSearchValidator(searchSchema),
  loaderDeps: ({ search }) => search as v.InferOutput<typeof searchSchema>,
  loader: async ({ deps }) => {
    const params = {} as TRPCParams<(typeof import('~s/trpc-procedures/route'))['RouteRouter']['/']>

    const posterHeightPx = 229
    const posterWidthPx = 162
    const posterTextHeightPx = oneRemInPx * 0.25 + oneRemInPx * 1.25 + oneRemInPx * 1
    const wrapperGapX = oneRemInPx * 1
    const wrapperGapY = oneRemInPx * 1.5
    const wrapperPaddingX = oneRemInPx * 3 * 2 // kiri kanan dihitung
    const wrapperPaddingY = oneRemInPx * 2.5 * 1 // cuma atas yang dihitung
    const headerHeight = oneRemInPx * 4

    const getScrollThresholdPx = (cols: number) => {
      return (posterHeightPx + posterTextHeightPx) * cols + wrapperGapY * (cols - 1)
    }

    params.perPage =
      Math.floor(
        (innerWidth - scrollbarWidth - wrapperPaddingX + wrapperGapX) /
          (posterWidthPx + wrapperGapX),
      ) *
      Math.ceil(
        (innerHeight - headerHeight - wrapperPaddingY + wrapperGapY) /
          (posterHeightPx + posterTextHeightPx + wrapperGapY),
      )

    params.x = Math.random()
    params.downloaded = Boolean(deps?.terunduh)

    return [params, getScrollThresholdPx(4), await fetchRouteData('/', params)] as const
  },
})

function Index() {
  const [params, scrollThresholdPx, initialData] = Route.useLoaderData()
  const animeListQuery = api.route['/'].useInfiniteQuery(params, {
    getNextPageParam: lastPage => lastPage.at(-1)?.id,
    refetchOnMount: false,
    initialData: {
      pages: [initialData],
      pageParams: [null],
    },
  })

  useEffect(() => {
    let timeoutId: Timer | null = setTimeout(() => {
      timeoutId = null

      animeListQuery.fetchNextPage()
    }, 200)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      animeListPages.setState(() => null as never)
    }
  }, [])

  const { pages } = animeListQuery.data!

  // setState engga dimasukkan kedalam useEffect karena
  // statenya langsung dipake oleh PosterDisplayGroup
  animeListPages.setState(() => pages)

  return (
    <main>
      <InfiniteScroll
        dataLength={(pages.length - 1) * params.perPage + pages.at(-1)!.length}
        next={animeListQuery.fetchNextPage}
        hasMore={animeListQuery.hasNextPage}
        loader={<></>}
        scrollThreshold={`${scrollThresholdPx}px`}
        className="grid grid-cols-[repeat(auto-fit,minmax(162px,1fr))] gap-x-4 gap-y-6 px-12 py-10"
      >
        {pages.map((_, index) => (
          <PosterDisplayGroup key={index} index={index} />
        ))}
      </InfiniteScroll>
    </main>
  )
}
