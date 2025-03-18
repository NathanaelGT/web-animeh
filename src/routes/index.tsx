import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { valibotSearchValidator } from '@tanstack/router-valibot-adapter'
import * as v from 'valibot'
import InfiniteScroll from 'react-infinite-scroll-component'
import { scrollbarWidth } from '~c/main'
import { api, type rpc } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { animeListPages } from '~c/stores'
import { randomBetween } from '~/shared/utils/number'
import { oneRemInPx } from '~c/utils/css'
import { Skeleton } from '@/ui/skeleton'
import { PosterDisplayGroup } from '@/page/home/PosterDisplayGroup'

type Params = Parameters<(typeof rpc.route)['/']['query']>[0]

const searchSchema = v.object({
  filter: v.optional(
    v.string() as unknown as v.PicklistSchema<NonNullable<Params['filter']>[], undefined>,
  ),
})

const posterHeightPx = 229
const posterWidthPx = 162
const posterTextHeightPx = oneRemInPx * 0.25 + oneRemInPx * 1.25 + oneRemInPx * 1
const wrapperGapX = oneRemInPx * 1
const wrapperGapY = oneRemInPx * 1.5
const wrapperPaddingX = oneRemInPx * 3 * 2 // kiri kanan dihitung
const wrapperPaddingY = oneRemInPx * 2.5 * 1 // cuma atas yang dihitung
const headerHeight = oneRemInPx * 4

const calculatePerPage = () => {
  return (
    Math.floor(
      (innerWidth - scrollbarWidth - wrapperPaddingX + wrapperGapX) / (posterWidthPx + wrapperGapX),
    ) *
    Math.ceil(
      (innerHeight - headerHeight - wrapperPaddingY + wrapperGapY) /
        (posterHeightPx + posterTextHeightPx + wrapperGapY),
    )
  )
}

export const Route = createFileRoute('/')({
  component: Index,
  pendingComponent: PendingIndex,
  validateSearch: valibotSearchValidator(searchSchema),
  loaderDeps: ({ search }) => search as v.InferOutput<typeof searchSchema>,
  loader: async ({ deps: { filter } }) => {
    const perPage = calculatePerPage()
    const params: Params = {
      perPage,
      filter,
    }
    const id = (filter ? perPage + Math.random() : perPage) + '_'

    const getScrollThresholdPx = (cols: number) => {
      return (posterHeightPx + posterTextHeightPx) * cols + wrapperGapY * (cols - 1)
    }

    return [params, getScrollThresholdPx(4), await fetchRouteData('/', params), id] as const
  },
})

const wrapperClassName =
  'grid grid-cols-[repeat(auto-fit,minmax(162px,1fr))] gap-x-4 gap-y-6 px-12 py-10'

function Index() {
  const [params, scrollThresholdPx, initialData, id] = Route.useLoaderData()
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

      if (animeListQuery.data.pages.length === 1) {
        animeListQuery.fetchNextPage()
      }
    }, 200)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [id])

  useEffect(() => {
    return () => {
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
        className={wrapperClassName}
      >
        {pages.map((_, index) => (
          <PosterDisplayGroup key={id + index} index={index} />
        ))}
      </InfiniteScroll>
    </main>
  )
}

function PendingIndex() {
  const [children] = useState(() => {
    let seed = Date.now()

    const children: JSX.Element[] = []
    const perPage = calculatePerPage()

    const infoSkeletonStyle = (...widths: number[]) => ({
      marginTop: '.21rem',
      marginBottom: '.06rem',
      height: '.73rem',
      width: widths[seed++ % widths.length] + 'rem',
    })

    const delays = [
      '',
      '[&_*]:delay-100',
      '[&_*]:delay-200',
      '[&_*]:delay-300',
      '[&_*]:delay-500',
      '[&_*]:delay-700',
      '[&_*]:delay-1000',
      '[&_*]:delay-700',
      '[&_*]:delay-500',
      '[&_*]:delay-300',
      '[&_*]:delay-200',
      '[&_*]:delay-100',
    ]

    for (let i = 0; i < perPage; i++) {
      children[i] = (
        <div key={i} className={`mx-auto w-[162px] ${delays[i % delays.length]}`}>
          <Skeleton className="h-[229px] w-[162px] rounded-md shadow outline outline-1 outline-slate-600/20" />

          <Skeleton
            style={{
              marginTop: '.6rem',
              marginBottom: '.05rem',
              height: '.85rem',
              width: randomBetween(20, 95) + '%',
            }}
          />

          <div className="flex justify-between">
            <Skeleton style={infoSkeletonStyle(2, 1.6, 1.5, 2.3, 0.9, 3.4)} />
            <Skeleton style={infoSkeletonStyle(0.6, 1, 2, 0.5, 0.9, 0.8)} />
            <Skeleton style={infoSkeletonStyle(1.3, 1.4, 1.5)} />
            <Skeleton style={infoSkeletonStyle(1.9, 1.6, 0.5)} />
          </div>
        </div>
      )
    }

    return children
  })

  return <main className={wrapperClassName}>{children}</main>
}
