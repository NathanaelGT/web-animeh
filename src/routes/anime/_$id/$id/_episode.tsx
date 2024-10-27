import { useState, useMemo, useRef, useEffect } from 'react'
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Filter } from 'lucide-react'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import {
  animeDataStore,
  animeWatchSessionStore,
  clientProfileSettingsStore,
  episodeListStore,
  type EpisodeList,
} from '~c/stores'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { generateTextWidth } from '~c/utils/skeleton'
import { searchEpisode } from '~/shared/utils/episode'
import { sleep } from '~/shared/utils/time'
import { combineFunction } from '~/shared/utils/function'
import { SearchFilter } from '@/page/anime/episodeLayout/SearchFilter'
import { SearchInput } from '@/page/anime/episodeLayout/SearchInput'
import { EpisodeSelector } from '@/page/anime/episodeLayout/EpisodeSelector'
import { AnimeTitle } from '@/Anime/Title'
import { SimpleBreadcrumb } from '@/ui/breadcrumb'
import { Skeleton } from '@/ui/skeleton'
import { Button } from '@/ui/button'
import { InputKeybind } from '@/ui/custom/input-keybind'

let latestAnimeId = ''

export const Route = createFileRoute('/anime/_$id/$id/_episode')({
  component: EpisodeLayout,
  pendingComponent: PendingEpisodeLayout,
  async loader({ params }) {
    try {
      return await fetchRouteData('/anime/_$id/$id/_episode', Number(params.id))
    } finally {
      latestAnimeId = params.id
    }
  },
  shouldReload: ({ params }) => params.id !== latestAnimeId,
})

function EpisodeLayout() {
  const { episodeFilter } = clientProfileSettingsStore.state
  const perPage = useStore(clientProfileSettingsStore, state => state.episodeFilter.perPage)

  const animeData = useStore(animeDataStore)
  const params = Route.useParams()
  const router = useRouter()
  const [displayMode, setDisplayMode] = useState(episodeFilter.displayMode)
  const [sortLatest, setSortLatest] = useState(episodeFilter.sortLatest)
  const [hideFiller, setHideFiller] = useState(episodeFilter.hideFiller)
  const [hideRecap, setHideRecap] = useState(episodeFilter.hideRecap)
  const episodeList = Route.useLoaderData() as EpisodeList

  const episodeCount = episodeList.length
  const pageCount = Math.ceil(episodeCount / perPage)

  const pageList = useMemo(() => {
    const result: [number, number][] = []

    if (sortLatest) {
      for (let i = 0; i < pageCount; i++) {
        const start = episodeCount - i * perPage
        const end = Math.max(1, start - perPage + 1)

        result[i] = [start, end]
      }
    } else {
      for (let i = 0; i < pageCount; i++) {
        const start = i * perPage + 1
        const end = i === pageCount - 1 ? episodeCount : (i + 1) * perPage

        result[i] = [start, end]
      }
    }

    return result
  }, [pageCount, sortLatest])

  // sesuaikan berdasarkan setting
  const [currentPage, setCurrentPage] = useState(
    pageList[0] ? pageList[0][0] + ' - ' + pageList[0][1] : '',
  )

  // pada saat transisi kehalaman lain, path engga bisa diandalin, jadi mesti nyimpan value sebelumnya
  const previousEpisodeRef = useRef<number>(1)
  const currentEpisode = useRouterState({
    select(state) {
      const { pathname } = state.location

      const indexOfEpisode = pathname.lastIndexOf('episode/')
      if (indexOfEpisode > 0) {
        return Number(pathname.slice(indexOfEpisode + 'episode/'.length))
      }

      return previousEpisodeRef.current
    },
  })
  previousEpisodeRef.current = currentEpisode

  const compactMode = displayMode === 'Auto' ? episodeCount > 50 : displayMode === 'Padat'

  const currentPageEpisodeList = useMemo(() => {
    const [start, end] = currentPage
      .split(' - ')
      .map(num => Number(num) - 1)
      .sort((a, b) => a - b) as [number, number]

    const result = episodeList.slice(start, end + 1).filter(episode => {
      if ((hideFiller && episode.isFiller) || (hideRecap && episode.isRecap)) {
        return false
      }

      return true
    })

    if (sortLatest) {
      result.reverse()
    }

    return result
  }, [currentPage, episodeCount, hideFiller, hideRecap, sortLatest])

  const episodeListRef = useRef<HTMLDivElement | null>(null)

  const search = (query: number) => {
    const page = sortLatest
      ? pageList.find(([start, end]) => query >= end && query <= start)
      : pageList.find(([start, end]) => query >= start && query <= end)

    if (!page) {
      return
    }

    const highlight = () => {
      requestAnimationFrame(async () => {
        const episodeList = episodeListRef.current
        const el = episodeList?.querySelector(`#episode_${query}`)

        if (!el) {
          return
        }

        if (episodeList!.scrollHeight > episodeList!.clientHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        const { classList } = el
        const zIndex = 'z-10'
        const ringColor = '!ring-indigo-400/75'
        const ringOffset = '!ring-offset-2'

        classList.add(zIndex, ringColor)
        await sleep(100)

        classList.add(ringOffset)
        await sleep(2000)

        classList.remove(ringOffset)
        await sleep(100)

        classList.remove(zIndex, ringColor)
      })
    }

    const updaters: (() => void)[] = []
    if (hideFiller || hideRecap) {
      const episode = searchEpisode(episodeList, query)

      if (hideFiller && episode?.isFiller) {
        updaters.push(() => {
          setHideFiller(false)
        })
      }
      if (hideRecap && episode?.isRecap) {
        updaters.push(() => {
          setHideRecap(false)
        })
      }
    }

    const newPage = page[0] + ' - ' + page[1]
    if (currentPage !== newPage) {
      updaters.push(() => {
        setCurrentPage(newPage)
      })
    }

    if (!updaters.length) {
      highlight()

      return
    }

    setTimeout(() => {
      updaters.forEach(updater => {
        updater()
      })

      // requestAnimationFrame untuk nunggu reactnya update
      requestAnimationFrame(() => {
        // setTimeout untuk nunggu EpisodeSelector render full
        setTimeout(() => {
          highlight()
        }, 50)
      })
    })
  }

  useEffect(() => {
    if (episodeList.length === 0) {
      return
    }

    const createGotoHandler = (episode: EpisodeList[number]) => () => {
      search(episode.number)

      router.navigate({
        to: '/anime/$id/episode/$number',
        params: { id: params.id, number: episode.number.toString() },
      })
    }

    return combineFunction(
      createKeybindHandler('watchPage', 'first', createGotoHandler(episodeList[0]!)),

      createKeybindHandler('watchPage', 'last', createGotoHandler(episodeList.at(-1)!)),
    )
  }, [episodeList, params.id])

  api.anime.episodes.useSubscription(Number(params.id), {
    onData(data) {
      for (let i = 0; i < episodeCount; i++) {
        episodeList[i] = {
          ...episodeList[i]!,
          downloadStatus: data[episodeList[i]!.number] ?? false,
        }
      }

      episodeListStore.setState(() => [...episodeList])
    },
  })

  // kalo pake useEffect, bakal error karena baru dijalankan setelah rendering
  // jadi disini ngeabuse useMemo biar callbacknya cuma jalan sekali sebelum rendering
  useMemo(() => {
    animeWatchSessionStore.setState(() => ({ id: Math.random().toString().slice(2) }))
  }, [])

  episodeListStore.setState(() => episodeList)

  return (
    <div className="flex flex-1 flex-col gap-6 md:px-8 md:py-6 lg:px-12 lg:py-10">
      <SimpleBreadcrumb
        links={[
          <Link to="/" preloadDelay={50}>
            Web Animeh
          </Link>,
          <AnimeTitle animeData={animeData} tag="h1" asLink />,
          animeData.totalEpisodes === 1 ? 'Nonton' : `Episode ${currentEpisode}`,
        ]}
        viewTransitionPrefix={params.id}
        itemClassName="drop-shadow-[0_0.1px_0.1px_rgba(0,0,0,.8)]"
        className="hidden md:block"
      />

      <div
        className={
          'flex h-full flex-1 flex-col-reverse overflow-hidden rounded-md bg-primary-foreground text-primary shadow-md outline outline-1 outline-primary/5' +
          (animeData.totalEpisodes === 1 ? '' : ' md:grid md:grid-cols-[16rem_1fr]')
        }
      >
        {animeData.totalEpisodes !== 1 && (
          <aside className="relative mx-auto w-full flex-1 bg-primary/[.03] md:h-full md:border-r md:border-primary/20">
            <div className="flex h-10 gap-2 bg-primary/75 p-2 text-slate-300 dark:bg-primary-foreground">
              <SearchFilter
                episodeListRef={episodeListRef}
                episodeCount={episodeCount}
                pageList={pageList}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                sortLatest={sortLatest}
                setSortLatest={setSortLatest}
                hideFiller={hideFiller}
                setHideFiller={setHideFiller}
                hideRecap={hideRecap}
                setHideRecap={setHideRecap}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />

              <SearchInput animeId={params.id} search={search} />
            </div>

            <div
              ref={episodeListRef}
              className={
                'h-fit scrollbar-thin scrollbar-thumb-primary/20 md:absolute md:inset-0 md:top-10 md:max-h-[calc(100%-2.5rem)] ' +
                (compactMode
                  ? 'grid grid-cols-[repeat(auto-fit,minmax(2.5rem,1fr))] gap-2 overflow-y-scroll p-2 text-xs md:grid-cols-5'
                  : 'overflow-y-auto text-sm')
              }
            >
              <EpisodeSelector
                key={params.id + '|' + currentPage}
                animeId={params.id}
                currentEpisode={currentEpisode ?? 1}
                episodeList={currentPageEpisodeList}
                compactMode={compactMode}
              />
            </div>
          </aside>
        )}

        <Outlet />
      </div>
    </div>
  )
}

function PendingEpisodeLayout() {
  const [titleWidths] = useState(() => generateTextWidth(1, 8, 21, 120))

  type TextSkeletonProps = {
    widths: ({ width: string } | number)[]
  }

  function TextSkeleton({ widths }: TextSkeletonProps) {
    return (
      <div className="flex flex-wrap gap-x-[1ch]">
        {widths.map(width => (
          <Skeleton
            className="mb-1 mt-0.5 h-3.5 select-none"
            style={typeof width === 'number' ? { width: width + 'px' } : width}
          >
            &nbsp;
          </Skeleton>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 md:px-8 md:py-6 lg:px-12 lg:py-10">
      <SimpleBreadcrumb
        links={[
          <TextSkeleton widths={[29, 47]} />,
          <TextSkeleton widths={titleWidths} />,
          <TextSkeleton widths={[49, 10]} />,
        ]}
        itemClassName="drop-shadow-[0_0.1px_0.1px_rgba(0,0,0,.8)]"
        className="hidden md:block"
      />

      <div className="flex h-full flex-1 flex-col-reverse overflow-hidden rounded-md bg-primary-foreground text-primary shadow-md outline outline-1 outline-primary/5 md:grid md:grid-cols-[16rem_1fr]">
        <aside className="relative mx-auto w-full flex-1 bg-primary/[.03] md:h-full md:border-r md:border-primary/20">
          <div className="flex h-10 gap-2 bg-primary/75 p-2 text-slate-300 dark:bg-primary-foreground">
            <Button
              variant="outline2"
              className="h-6 w-6 border-slate-300 bg-transparent p-1 md:mx-2"
            >
              <Filter />
            </Button>

            <InputKeybind
              ref={() => {}}
              type="number"
              autoComplete="off"
              placeholder="Cari episode..."
              keybindId={['watchPage', 'search']}
              wrapperClassName="h-6 border-slate-300 ring-indigo-400/75 focus-within:ring-1"
              buttonClassName="px-[.2rem]"
              tipClassName="h-4 min-w-4 border-slate-300/50 px-[.2rem] py-[.05rem] text-[.6rem]"
              disabled
              className="placeholder:text-slate-300/75"
            />
          </div>

          <div className="h-fit md:absolute md:inset-0 md:top-10 md:max-h-[calc(100%-2.5rem)]">
            <Skeleton className="rounded-none" />
          </div>
        </aside>

        <Skeleton className="rounded-none" />
      </div>
    </div>
  )
}
