import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Play } from 'lucide-react'
import { useEffect, useMemo, memo, type ReactNode, type ReactElement } from 'react'
import BaseTextTransition, { presets } from 'react-text-transition'
import { animeDataStore, type AnimeData } from '~c/stores'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { generateTextWidth, generateTextWidthList } from '~c/utils/skeleton'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'
import { AnimePoster } from '@/Anime/Poster'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeTitle } from '@/Anime/Title'
import { AnimeType } from '@/Anime/Type'
import { SimpleBreadcrumb } from '@/ui/breadcrumb'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { Skeleton } from '@/ui/skeleton'
import { randomBetween } from '~/shared/utils/number'

export const Route = createFileRoute('/anime/_$id/$id/')({
  component: AnimeId,
})

const SHADOW = 'drop-shadow-[0_0.1px_0.1px_rgba(0,0,0,.8)]'
const MAIN_CLASSNAME = [
  "grid flex-1 gap-x-6 gap-y-3 p-4 [grid-template-areas:'bread''poster''main''info']",
  "sm:grid-cols-[225px_1fr] sm:grid-rows-[auto_auto_1fr] sm:px-8 sm:py-6 sm:[grid-template-areas:'poster_bread''poster_main''info_main']",
  "lg:grid-cols-[225px_1fr_15rem] lg:grid-rows-[auto_1fr] lg:gap-y-1 lg:px-12 lg:py-10 lg:[grid-template-areas:'poster_bread_info''poster_main_info']",
  'xl:grid-cols-[225px_1fr_19rem]',
].join(' ')

function AnimeId() {
  const animeData = useStore(animeDataStore)
  if (animeData) {
    return <RealAnimeId animeData={animeData} />
  }

  return <PendingAnimeId />
}

function RealAnimeId({ animeData }: { animeData: AnimeData }) {
  const router = useRouter()

  useEffect(() => {
    const id = animeData?.id
    if (!id) {
      return
    }

    return createKeybindHandler('animePage', 'watch', () => {
      router.navigate({
        to: '/anime/$id/episode/$number',
        params: { id: id.toString(), number: '1' },
      })
    })
  }, [animeData?.id])

  const [studios, producers, licensors] = useMemo(() => {
    const studios: (string | JSX.Element)[] = []
    const producers: (string | JSX.Element)[] = []
    const licensors: (string | JSX.Element)[] = []

    let loadingPlaceholderKey = 0
    for (const studio of animeData.studios) {
      const name = studio.name ?? (
        <span key={++loadingPlaceholderKey} className={`text-slate-400 ${SHADOW}`}>
          Loading
        </span>
      )

      if (studio.type === 'studio') {
        studios.push(name, ', ')
      } else if (studio.type === 'producer') {
        producers.push(name, ', ')
      } else {
        licensors.push(name, ', ')
      }
    }

    // untuk ngehilangin koma terakhir
    studios.pop()
    producers.pop()
    licensors.pop()

    return [studios, producers, licensors]
  }, [animeData.studios])

  if (!animeData) {
    return <main className="flex flex-1 items-center justify-center">Anime tidak ditemukan</main>
  }

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
  })

  return (
    <main key={animeData.id} className={MAIN_CLASSNAME}>
      <SimpleBreadcrumb
        links={[
          <Link to="/$" preloadDelay={50}>
            Web Animeh
          </Link>,
          <AnimeTitle animeData={animeData} />,
        ]}
        itemClassName={SHADOW}
        viewTransitionPrefix={animeData.id}
        className="[grid-area:bread]"
      />

      <div className="flex flex-col items-center gap-3 [grid-area:poster]">
        <AnimePoster anime={animeData} className="shadow-sm shadow-foreground/50" />

        {animeData.isVisible && (
          <div className="grid w-[225px] gap-3">
            <Button
              asChild
              variant="sky"
              className="gap-2 text-lg font-bold shadow-sm shadow-foreground/25"
            >
              <Link
                to="/anime/$id/episode/$number"
                params={{ id: animeData.id.toString(), number: '1' }}
              >
                <Play />
                Nonton
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 [grid-area:main] sm:items-start">
        <div className="mt-4 sm:mt-0">
          <AnimeTitle animeData={animeData} tag="h1" className="w-fit text-3xl" />
          {animeData.englishTitle && (
            <AnimeTitle
              animeData={{
                id: animeData.id,
                title: animeData.englishTitle,
              }}
              tag="h2"
              className={`w-fit text-xs text-muted-foreground ${SHADOW}`}
            />
          )}
        </div>

        <div className="w-fit rounded-lg bg-primary/10 p-px">
          <div className="flex gap-[2px] overflow-hidden rounded-md text-xs text-slate-800 shadow-md">
            <AnimeType type={animeData.type} />
            <AnimeRating rating={animeData.rating} />
            <AnimeDuration duration={animeData.duration} />
            {animeData.totalEpisodes && <AnimeEpisode episode={animeData.totalEpisodes} />}
          </div>
        </div>

        {animeData.synopsis ? (
          <p
            dangerouslySetInnerHTML={{ __html: animeData.synopsis }}
            className="text-justify text-wrap whitespace-pre-wrap"
          />
        ) : animeData.synopsis === '' ? (
          <p className="text-muted-foreground">Tidak ada sinopsis</p>
        ) : (
          <p className="text-muted-foreground">Loading</p>
        )}
      </div>

      <div className="flex flex-col gap-3 [grid-area:info] lg:-mt-26 lg:-mr-12 lg:-mb-10 lg:bg-primary/10 lg:pt-26 lg:pr-12 lg:pb-10 lg:pl-4">
        <Stat title="Sinonim" stat={animeData.synonyms.join(', ')} />

        {animeData.airedFrom &&
          (animeData.totalEpisodes === 1 ? (
            <Stat title="Tanggal tayang" stat={dateFormatter.format(animeData.airedFrom)} />
          ) : (
            <>
              <Stat title="Tayang mulai" stat={dateFormatter.format(animeData.airedFrom)} />
              <Stat
                title="Tayang sampai"
                stat={animeData.airedTo ? dateFormatter.format(animeData.airedTo) : '?'}
              />
            </>
          ))}

        <Stat
          title="Skor"
          stat={<Transition text={animeData.score?.toLocaleString('id-ID')} />}
          suffix={
            animeData.scoredBy && (
              <span>
                {' '}
                (dari <Transition text={animeData.scoredBy.toLocaleString('id-ID')} /> pengguna)
              </span>
            )
          }
        />
        <Stat
          title="Peringkat"
          stat={<Transition text={animeData.rank?.toString()} />}
          prefix="#"
        />
        <Stat
          title="Popularitas"
          stat={<Transition text={animeData.popularity?.toString()} />}
          prefix="#"
        />
        <Stat
          title="Penonton"
          stat={<Transition text={animeData.members?.toLocaleString('id-ID')} />}
        />

        {animeData.genres.length > 0 && (
          <>
            <Separator className="bg-primary/20" />
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <span>
                <span className="font-bold">Genre</span>:{' '}
              </span>
              {animeData.genres.map(genre => (
                <span key={genre} className="rounded-full border border-primary/40 px-2">
                  {genre}
                </span>
              ))}
            </div>
            <Separator className="bg-primary/20" />
          </>
        )}

        <Stat title="Studio" stat={studios} />
        <Stat title="Produser" stat={producers} />
        <Stat title="Lisensor" stat={licensors} />
      </div>
    </main>
  )
}

type StatProps = {
  title: string | JSX.Element
  stat: ReactNode
  prefix?: ReactNode
  suffix?: ReactNode
}

function Stat({ title, stat, prefix, suffix }: StatProps) {
  if (!stat && stat !== 0) {
    return null
  } else if ((stat as { length: number }).length < 1) {
    return null
  } else if ((stat as ReactElement).props) {
    if (!((stat as ReactElement).props as TransitionProps).text) {
      return null
    }
  }

  return (
    <div>
      <span className="font-bold">{title}</span>: {prefix}
      {stat}
      {suffix}
    </div>
  )
}

type TransitionProps = {
  text: string | undefined | null
}

function Transition({ text }: TransitionProps) {
  if (!text) {
    return null
  }

  return (
    <div className="relative inline-block">
      <span className="invisible">{text}</span>
      <div className="absolute top-0 left-0 flex">
        {text.split('').map((char, i) => (
          <BaseTextTransition key={i} springConfig={presets.wobbly}>
            {char}
          </BaseTextTransition>
        ))}
      </div>
    </div>
  )
}

// dimasukin kedalam memo untuk menghindari komponennya rerender karena parentnya rerender
// kalo sampe rerender, nanti state randomnya berubah
const PendingAnimeId = memo(function PendingAnimeId() {
  let seed = Date.now()

  const infoSkeletonStyle = (...widths: number[]) => ({
    padding: '0 .5rem',
    height: '1.5rem',
    borderRadius: '0',
    width: widths[seed++ % widths.length] + 'rem',
  })

  const titleWidth = generateTextWidth(1, 8, 21, 120)

  return (
    <main className={MAIN_CLASSNAME}>
      <SimpleBreadcrumb
        links={[
          <div className="flex flex-wrap gap-x-[1ch]">
            <Skeleton className="mt-0.5 mb-1 h-3.5 select-none" style={{ width: '29px' }}>
              &nbsp;
            </Skeleton>
            <Skeleton className="mt-0.5 mb-1 h-3.5 select-none" style={{ width: '47px' }}>
              &nbsp;
            </Skeleton>
          </div>,
          <div className="flex flex-wrap gap-x-[1ch]">
            {titleWidth.map(width => (
              <Skeleton className="mt-0.5 mb-1 h-3.5 select-none" style={width}>
                &nbsp;
              </Skeleton>
            ))}
          </div>,
        ]}
        itemClassName={SHADOW}
        className="[grid-area:bread]"
      />

      <div className="flex flex-col items-center gap-3 [grid-area:poster]">
        <Skeleton className="h-[318px] w-[225px] rounded-md shadow-sm shadow-foreground/50 outline-1 outline-slate-600/20 outline-solid" />

        <div className="grid w-[225px] gap-3">
          <Skeleton className="h-11 rounded-md shadow-sm shadow-foreground/25" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 [grid-area:main] sm:items-start">
        <div className="mt-4 sm:mt-0">
          <div className="flex flex-wrap gap-x-[1ch]">
            {titleWidth.map(width => (
              <Skeleton className="mt-0.5 mb-1 h-7.5 select-none" style={width}>
                &nbsp;
              </Skeleton>
            ))}
          </div>
          <div className={`flex flex-wrap gap-x-[1ch] ${SHADOW}`}>
            {generateTextWidth(4, 15).map(width => (
              <Skeleton className="mt-0.5 mb-1 h-2.5 select-none" style={width}>
                &nbsp;
              </Skeleton>
            ))}
          </div>
        </div>

        <div className="w-fit rounded-lg p-px">
          <div className="flex gap-[2px] overflow-hidden rounded-md">
            <Skeleton style={infoSkeletonStyle(2, 1.6, 1.5, 2.3, 0.9, 3.4)} />
            <Skeleton style={infoSkeletonStyle(0.6, 1, 2, 0.5, 0.9, 0.8)} />
            <Skeleton style={infoSkeletonStyle(1.3, 1.4, 1.5)} />
            {Math.random() > 0.5 && <Skeleton style={infoSkeletonStyle(1.9, 1.6, 0.5)} />}
          </div>
        </div>

        <div className="grid w-full gap-6">
          {generateTextWidthList([1, 3], [20, 140]).map(synopsisWidth => (
            <div className="flex flex-wrap gap-x-[1ch]">
              {synopsisWidth.map(width => (
                <Skeleton className="mt-0.5 mb-1 h-4.5" style={width} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 [grid-area:info] lg:-mt-26 lg:-mr-12 lg:-mb-10 lg:bg-primary/10 lg:pt-26 lg:pr-12 lg:pb-10 lg:pl-4">
        <Stat
          title={<Skeleton className="mt-0.5 mb-1 h-4.5 w-15" />}
          stat={
            <div className="flex flex-wrap gap-x-[1ch]">
              {generateTextWidth(3, 30).map(width => (
                <Skeleton className="mt-0.5 mb-1 h-4.5" style={width} />
              ))}
            </div>
          }
        />

        {Math.random() > 0.3 &&
          (Math.random() > 0.9 ? (
            <Stat
              title={
                <div className="flex flex-wrap gap-x-[1ch]">
                  <Skeleton className="mt-0.5 mb-1 h-4.5 w-[3.7rem]" />
                  <Skeleton className="mt-0.5 mb-1 h-4.5 w-[3.1rem]" />
                </div>
              }
              stat={
                <div className="flex flex-wrap gap-x-[1ch]">
                  <Skeleton className="mt-0.5 mb-1 h-4.5 w-14" />
                  <Skeleton className="mt-0.5 mb-1 h-4.5 w-[1.1rem]" />
                  <Skeleton
                    className="mt-0.5 mb-1 h-4.5"
                    style={{ width: randomBetween(25, 80) + 'px' }}
                  />
                  <Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.3rem]" />
                </div>
              }
            />
          ) : (
            <>
              <Stat
                title={
                  <div className="flex flex-wrap gap-x-[1ch]">
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[3.2rem]" />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-10" />
                  </div>
                }
                stat={
                  <div className="flex flex-wrap gap-x-[1ch]">
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-14" />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[1.1rem]" />
                    <Skeleton
                      className="mt-0.5 mb-1 h-4.5"
                      style={{ width: randomBetween(25, 80) + 'px' }}
                    />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.3rem]" />
                  </div>
                }
              />
              <Stat
                title={
                  <div className="flex flex-wrap gap-x-[1ch]">
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[3.2rem]" />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[3.2rem]" />
                  </div>
                }
                stat={
                  <div className="flex flex-wrap gap-x-[1ch]">
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-14" />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[1.1rem]" />
                    <Skeleton
                      className="mt-0.5 mb-1 h-4.5"
                      style={{ width: randomBetween(25, 80) + 'px' }}
                    />
                    <Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.3rem]" />
                  </div>
                }
              />
            </>
          ))}

        <Stat
          title={<Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.1rem]" />}
          stat={<Skeleton className="mt-0.5 mb-1 h-4.5 w-[1.9rem]" />}
          suffix={
            <div className="inline-flex flex-wrap gap-x-[1ch]">
              <span />
              <Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.1rem]" />
              <Skeleton
                className="mt-0.5 mb-1 h-4.5"
                style={{ width: randomBetween(40, 52) + 'px' }}
              />
              <Skeleton className="mt-0.5 mb-1 h-4.5 w-[4.8rem]" />
            </div>
          }
        />
        <Stat
          title={<Skeleton className="mt-0.5 mb-1 h-4.5 w-[4.4rem]" />}
          stat={
            <Skeleton
              className="mt-0.5 mb-1 h-4.5"
              style={{ width: randomBetween(30, 40) + 'px' }}
            />
          }
        />
        <Stat
          title={<Skeleton className="mt-0.5 mb-1 h-4.5 w-[2.6rem]" />}
          stat={
            <Skeleton
              className="mt-0.5 mb-1 h-4.5"
              style={{ width: randomBetween(30, 40) + 'px' }}
            />
          }
        />
        <Stat
          title={<Skeleton className="mt-0.5 mb-1 h-4.5 w-[4.4rem]" />}
          stat={
            <Skeleton
              className="mt-0.5 mb-1 h-4.5"
              style={{ width: randomBetween(48, 56) + 'px' }}
            />
          }
        />
      </div>
    </main>
  )
})
