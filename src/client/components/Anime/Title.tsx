import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { SquarePlus, Copy } from 'lucide-react'
import { api } from '~c/trpc'
import { toast } from '@/ui/use-toast'
import { MapObject } from '@/logic/MapObject'
import { Image } from '@/Image'
import { MyAnimeList } from '@/svg/MyAnimeList'
import { Kuramanime } from '@/svg/Kuramanime'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/ui/context-menu'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from '@/ui/tooltip'
import type { ComponentProps, ReactNode } from 'react'
import type { AnimeData as BaseAnimeData } from '~c/stores'

const copy = (text: string | undefined) => {
  const handleFail = () => {
    toast({
      title: 'Gagal menyalin tautan',
    })
  }

  if (text) {
    navigator.clipboard.writeText(text).catch(handleFail)
  } else {
    handleFail()
  }
}

export type AnimeData = Pick<BaseAnimeData, 'id' | 'title'>

type Tag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'

type Props<TTag extends Tag, TAsLink extends boolean> = (TAsLink extends true
  ? ComponentProps<'a'>
  : ComponentProps<TTag>) & {
  animeData: AnimeData
  withTooltip?: boolean
  asLink?: TAsLink
  tag?: TTag
}

export function AnimeTitle<TTag extends Tag = 'p', TAsLink extends boolean = false>({
  animeData,
  withTooltip,
  asLink,
  tag: _TagName = 'p' as TTag,
  ...props
}: Props<TTag, TAsLink>) {
  const TagName = _TagName as Tag

  const [shouldQueryContext, setShouldQueryContext] = useState(false)
  const contextQuery = api.component.animeTitle.context.useQuery(animeData.id, {
    enabled: shouldQueryContext,
  })

  const onTriggerMouseDown = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    if (!shouldQueryContext && event.button === 2) {
      setShouldQueryContext(true)
    }
  }

  let text = asLink ? (
    <Link to="/anime/$id" params={{ id: animeData.id.toString() }} {...(props as {})}>
      {animeData.title}
    </Link>
  ) : (
    animeData.title
  )

  text = withTooltip ? <TitleTooltip animeData={animeData}>{text}</TitleTooltip> : text

  const iconMap: Record<
    keyof NonNullable<typeof contextQuery.data>['url'],
    (props: Omit<ComponentProps<'svg'>, 'children'>) => JSX.Element
  > = {
    Kuramanime,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onMouseDown={onTriggerMouseDown}>
        {asLink ? <TagName>{text}</TagName> : <TagName {...(props as {})}>{text}</TagName>}
      </ContextMenuTrigger>

      {contextQuery.data && (
        <ContextMenuContent className="w-52">
          <ContextLink icon={SquarePlus} href={`/anime/${animeData.id}`} text="tab baru" />

          <ContextLink
            icon={MyAnimeList}
            href={`https://myanimelist.net/anime/${animeData.id}`}
            text="MyAnimeList"
          />

          <MapObject
            data={contextQuery.data.url}
            cb={(href, provider) => (
              <ContextLink key={provider} icon={iconMap[provider]} href={href} text={provider} />
            )}
          />

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => {
              copy(animeData.title)
            }}
            role="button"
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Salin judul
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}

type TitleTooltipProps = {
  animeData: AnimeData
  children: string | JSX.Element
}

function TitleTooltip({ animeData, children }: TitleTooltipProps) {
  const [shouldQueryPreview, setShouldQueryPreview] = useState(false)
  const previewQuery = api.component.animeTitle.preview.useQuery(animeData.id, {
    enabled: shouldQueryPreview,
  })

  const onTooltipChangeOpen = (isOpen: boolean) => {
    if (!shouldQueryPreview && isOpen) {
      setShouldQueryPreview(true)
    }
  }

  const { data } = previewQuery

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={onTooltipChangeOpen}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        {data && (
          <TooltipContent className="max-w-lg rounded-md bg-popover p-0 text-popover-foreground">
            <div className="bg-muted px-5 py-3">
              <Link
                to="/anime/$id"
                params={{ id: animeData.id.toString() }}
                className="text-lg font-semibold"
              >
                {animeData.title}
              </Link>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 p-5 text-sm">
              <Link to="/anime/$id" params={{ id: animeData.id.toString() }} tabIndex={-1}>
                <Image
                  src={animeData.id}
                  className="h-[220px] w-[156px] rounded-md bg-muted object-cover shadow outline outline-1 outline-slate-600/20"
                />
              </Link>
              {data.synopsis ? (
                <p
                  className="line-clamp-1 whitespace-pre text-pretty text-justify"
                  // line-height dari text-sm = 1.25rem = 20px, height gambar = 220px
                  // arbitrary value dari tailwind ngebug, gabisa pake line-clamp-[11]
                  style={{ WebkitLineClamp: 11 }}
                >
                  {data.synopsis.replaceAll('\n\n', '\n')}
                </p>
              ) : (
                <p className="text-muted-foreground">Tidak ada sinopsis</p>
              )}

              <div className="col-span-2 grid gap-1">
                <div>
                  <span className="font-bold">Episode</span>: {data.currentEpisode}/
                  {data.totalEpisodes ?? '?'}
                </div>

                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span>
                    <span className="font-bold">Genre</span>:{' '}
                  </span>
                  {data.genres.map(genre => (
                    <span key={genre} className="rounded-full border border-primary/40 px-2">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <TooltipArrow className="-mt-[1px] fill-popover" />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

type Icon = (props: Omit<ComponentProps<'svg'>, 'children'>) => ReactNode

type ContextLinkProps = {
  icon: Icon
  href: `https://${string}` | `/${string}`
  text: string
}

function ContextLink({ icon: Icon, href, text }: ContextLinkProps) {
  const handleCopy = () => {
    copy(href.startsWith('/') ? origin + href : href)
  }

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="grid grid-cols-[1fr_auto] p-0 pr-2">
        <a href={href} target="_blank" className="cursor-pointer px-2 py-1.5">
          <Icon className="mr-2 inline h-4 w-4" />
          Buka di {text}
        </a>
      </ContextMenuSubTrigger>

      <ContextMenuSubContent className="w-40">
        <ContextMenuItem asChild>
          <a href={href} target="_blank" className="cursor-pointer">
            Buka di {text}
          </a>
        </ContextMenuItem>

        <ContextMenuItem onClick={handleCopy} role="button" className="cursor-pointer">
          Salin
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
