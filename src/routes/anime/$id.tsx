import { createFileRoute, Link } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/breadcrumb'
import { Image } from '@/Image'
import { AnimePoster } from '@/Anime/Poster'
import { AnimeType } from '@/Anime/Type'
import { AnimeRating } from '@/Anime/Rating'
import { AnimeDuration } from '@/Anime/Duration'
import { AnimeEpisode } from '@/Anime/Episode'
import { Separator } from '@/ui/separator'

export const Route = createFileRoute('/anime/$id')({
  component: AnimeId,
  loader: ({ params }) => fetchRouteData('/anime/$id', Number(params.id)),
})

function AnimeId() {
  const animeData = Route.useLoaderData()
  const params = Route.useParams()

  if (animeData === undefined) {
    return <div>Not found</div>
  }

  const SHADOW = 'drop-shadow-[0_0.1px_0.1px_rgba(0,0,0,0.8)]'

  const studios: string[] = []
  const producers: string[] = []

  for (const studio of animeData.studios) {
    const name = studio.name ?? `<span class="text-slate-400 ${SHADOW}">Loading</span>`

    if (studio.type === 'studio') {
      studios.push(name)
    } else {
      producers.push(name)
    }
  }

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
  })

  return (
    <>
      <div className="fixed -z-50 h-auto overflow-hidden">
        <Image
          src={params.id + '.' + animeData.imageExtension}
          className="h-screen w-screen opacity-40 blur-xl"
        />
      </div>
      <main className="grid flex-1 gap-6 px-12 py-10 [grid-template-areas:'poster''main''info'] sm:grid-cols-[225px_1fr] sm:[grid-template-areas:'poster_main''info_main'] lg:grid-cols-[225px_1fr_15rem] lg:[grid-template-areas:'poster_main_info'] xl:grid-cols-[225px_1fr_19rem]">
        <div className="flex flex-col items-center gap-3 [grid-area:poster]">
          <AnimePoster anime={{ id: params.id, imageExtension: animeData.imageExtension }} />
        </div>

        <div className="flex flex-col gap-3 [grid-area:main]">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className={SHADOW}>
                  <Link to="/" preloadDelay={50}>
                    Web Animeh
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{animeData.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <h1 className="text-3xl">{animeData.title}</h1>
            {animeData.englishTitle && (
              <h2 className={`text-xs text-slate-500 ${SHADOW}`}>{animeData.englishTitle}</h2>
            )}
          </div>

          <div className="w-fit rounded-lg bg-primary/10 p-[1px]">
            <div className="flex gap-[2px] overflow-hidden rounded-md text-xs text-primary shadow-md">
              <AnimeType type={animeData.type} />
              <AnimeRating rating={animeData.rating} />
              <AnimeDuration duration={animeData.duration} />
              {animeData.totalEpisodes && <AnimeEpisode episode={animeData.totalEpisodes} />}
            </div>
          </div>

          {animeData.synopsis && (
            <div>
              <p
                dangerouslySetInnerHTML={{ __html: animeData.synopsis }}
                className="text-justify"
              />
            </div>
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
                  <span className="rounded-full border border-primary/40 px-2">{genre}</span>
                ))}
              </div>
              <Separator className="bg-primary/20" />
            </>
          )}
          {studios.length > 0 && (
            <div>
              <span className="font-bold">Studio</span>:{' '}
              <span dangerouslySetInnerHTML={{ __html: studios.join(', ') }} />
            </div>
          )}
          {producers.length > 0 && (
            <div>
              <span className="font-bold">Produser</span>:{' '}
              <span dangerouslySetInnerHTML={{ __html: producers.join(', ') }} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
