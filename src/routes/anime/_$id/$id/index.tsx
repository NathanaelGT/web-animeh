import { useEffect, useMemo } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Play } from 'lucide-react'
import { animeDataStore } from '~c/stores'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { SimpleBreadcrumb } from '@/ui/breadcrumb'
import { AnimePoster } from '@/Anime/Poster'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'

export const Route = createFileRoute('/anime/_$id/$id/')({
  component: AnimeId,
})

function AnimeId() {
  const animeData = useStore(animeDataStore)
  const router = useRouter()

  const { id } = animeData

  useEffect(() => {
    if (!animeData) {
      return
    }

    return createKeybindHandler('animePage', 'watch', () => {
      router.navigate({
        to: '/anime/$id/episode/$number',
        params: { id: id.toString(), number: '1' },
      })
    })
  }, [id])

  const SHADOW = 'drop-shadow-[0_0.1px_0.1px_rgba(0,0,0,.8)]'

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
    <main
      className={[
        "grid flex-1 gap-x-6 gap-y-3 p-4 [grid-template-areas:'bread''poster''main''info']",
        "sm:grid-cols-[225px_1fr] sm:grid-rows-[auto_auto_1fr] sm:px-8 sm:py-6 sm:[grid-template-areas:'poster_bread''poster_main''info_main']",
        "lg:grid-cols-[225px_1fr_15rem] lg:grid-rows-[auto_1fr] lg:gap-y-1 lg:px-12 lg:py-10 lg:[grid-template-areas:'poster_bread_info''poster_main_info']",
        'xl:grid-cols-[225px_1fr_19rem]',
      ].join(' ')}
    >
      <SimpleBreadcrumb
        links={[
          <Link to="/" preloadDelay={50}>
            Web Animeh
          </Link>,
          animeData.title,
        ]}
        itemClassName={SHADOW}
        viewTransitionPrefix={id}
        className="[grid-area:bread]"
      />

      <div className="flex flex-col items-center gap-3 [grid-area:poster]">
        <AnimePoster
          anime={{
            id,
            title: animeData.title,
            imageExtension: animeData.imageExtension,
          }}
          className="shadow shadow-foreground/50"
        />

        <div className="grid w-[225px] gap-3">
          <Button
            asChild
            variant="sky"
            className="gap-2 text-lg font-bold shadow shadow-foreground/25"
          >
            <Link to="/anime/$id/episode/$number" params={{ id: id.toString(), number: '1' }}>
              <Play />
              Nonton
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 [grid-area:main] sm:items-start">
        <div className="mt-4 sm:mt-0">
          <h1 className="text-3xl">{animeData.title}</h1>
          {animeData.englishTitle && (
            <h2 className={`text-xs text-muted-foreground ${SHADOW}`}>{animeData.englishTitle}</h2>
          )}
        </div>

        <div className="w-fit rounded-lg bg-primary/10 p-[1px]">
          <div className="flex gap-[2px] overflow-hidden rounded-md text-xs text-primary text-slate-800 shadow-md">
            <AnimeType type={animeData.type} />
            <AnimeRating rating={animeData.rating} />
            <AnimeDuration duration={animeData.duration} />
            {animeData.totalEpisodes && <AnimeEpisode episode={animeData.totalEpisodes} />}
          </div>
        </div>

        {animeData.synopsis ? (
          <p
            dangerouslySetInnerHTML={{ __html: animeData.synopsis }}
            className="whitespace-pre text-wrap text-justify"
          />
        ) : animeData.synopsis === '' ? (
          <p className="text-muted-foreground">Tidak ada sinopsis</p>
        ) : (
          <p className="text-muted-foreground">Loading</p>
        )}
      </div>

      <div className="flex flex-col gap-3 [grid-area:info] lg:-mb-10 lg:-mr-12 lg:-mt-[6.5rem] lg:bg-primary/10 lg:pb-10 lg:pl-4 lg:pr-12 lg:pt-[6.5rem]">
        {animeData.synonyms.length > 0 && <div>Sinonim: {animeData.synonyms.join(', ')}</div>}
        {animeData.airedFrom &&
          (animeData.totalEpisodes === 1 ? (
            <div>
              <span className="font-bold">Tanggal tayang</span>:{' '}
              {dateFormatter.format(animeData.airedFrom)}
            </div>
          ) : (
            <>
              <div>
                <span className="font-bold">Tayang mulai</span>:{' '}
                {dateFormatter.format(animeData.airedFrom)}
              </div>
              <div>
                <span className="font-bold">Tayang sampai</span>:{' '}
                {animeData.airedTo ? dateFormatter.format(animeData.airedTo) : '?'}
              </div>
            </>
          ))}
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
        {studios.length > 0 && (
          <div>
            <span className="font-bold">Studio</span>: <span>{studios}</span>
          </div>
        )}
        {producers.length > 0 && (
          <div>
            <span className="font-bold">Produser</span>: <span>{producers}</span>
          </div>
        )}
        {licensors.length > 0 && (
          <div>
            <span className="font-bold">Lisensor</span>: <span>{licensors}</span>
          </div>
        )}
      </div>
    </main>
  )
}
