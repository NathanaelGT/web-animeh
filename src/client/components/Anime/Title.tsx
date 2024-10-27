import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '~/client/trpc'
import { toast } from '@/ui/use-toast'
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
import { SimpleTooltip } from '@/ui/tooltip'
import type { ComponentProps } from 'react'
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

type AnimeData = Pick<BaseAnimeData, 'id' | 'title'>

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

  text = withTooltip ? <SimpleTooltip title={animeData.title}>{text}</SimpleTooltip> : text

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onMouseDown={onTriggerMouseDown}>
        {asLink ? <TagName>{text}</TagName> : <TagName {...(props as {})}>{text}</TagName>}
      </ContextMenuTrigger>

      {contextQuery.data && (
        <ContextMenuContent className="w-48">
          <ContextLink>
            <Link to="/anime/$id" params={{ id: animeData.id.toString() }} target="_blank">
              Buka di tab baru
            </Link>
          </ContextLink>

          <ContextLink href={`https://myanimelist.net/anime/${animeData.id}`} text="MyAnimeList" />

          {contextQuery.data.kuramanimeUrl && (
            <ContextLink href={contextQuery.data.kuramanimeUrl} text="Kuramanime" />
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => {
              copy(animeData.title)
            }}
          >
            Salin judul
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}

type ContextLinkProps =
  | {
      children: JSX.Element
    }
  | {
      href: string
      text: string
    }

function ContextLink(_props: ContextLinkProps) {
  const props = _props as
    | {
        children: JSX.Element
        href: undefined
        text: undefined
      }
    | {
        children: undefined
        href: string
        text: string
      }

  const anchor = props.children ?? (
    <a href={props.href} target="_blank">
      Buka di {props.text}
    </a>
  )

  const handleCopy = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    copy(
      props.href ??
        (
          event.currentTarget.previousElementSibling?.firstElementChild as
            | HTMLAnchorElement
            | undefined
        )?.href,
    )
  }

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>{anchor}</ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-40">
        <ContextMenuItem>{anchor}</ContextMenuItem>
        <ContextMenuItem onClick={handleCopy}>Salin</ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
