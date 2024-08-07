import { Link } from '@tanstack/react-router'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/ui/context-menu'
import { Image } from '@/Image'
import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  small?: boolean
  asLink?: boolean
  anime: {
    id: number | string
    imageExtension: string | null
  }
}>

export function AnimePoster({ small, asLink, anime, children }: Props) {
  const poster = (
    <Image
      src={anime.id}
      className={
        (small ? 'max-h-[229px] max-w-[162px]' : 'max-h-[318px] max-w-[225px]') +
        ' rounded-md object-cover shadow outline outline-1 outline-slate-600/20'
      }
    />
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative block transition-all hover:scale-105">
          {asLink ? (
            <Link to="/anime/$id" params={{ id: anime.id.toString() }}>
              {poster}
              {children}
            </Link>
          ) : (
            <>
              {poster}
              {children}
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem>Nonton Nanti</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Nonton</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem>
              {/* <PlusCircledIcon className="mr-2 h-4 w-4" /> */}
              Lanjut
            </ContextMenuItem>
            <ContextMenuSeparator />
            {[5, 4, 3, 2, 1].map(episode => (
              <ContextMenuItem key={episode}>Episode {episode}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Download</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem>
              {/* <PlusCircledIcon className="mr-2 h-4 w-4" /> */}
              Semua
            </ContextMenuItem>
            <ContextMenuSeparator />
            {[5, 4, 3, 2, 1].map(episode => (
              <ContextMenuItem key={episode}>Episode {episode}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}
