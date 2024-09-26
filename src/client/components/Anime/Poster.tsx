import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '~c/trpc'
import { useToast } from '@/ui/use-toast'
import { MapArray } from '@/logic/MapArray'
import { MapTrpc } from '@/logic/MapTrpc'
import { ToastAction } from '@/ui/toast'
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
    id: number
    title: string
  }
  tabIndex?: number
  className?: string
}>

export function AnimePoster({ small, asLink, anime, tabIndex, className, children }: Props) {
  const { toast } = useToast()
  const [shouldQuery, setShouldQuery] = useState(false)
  const downloadEpisode = api.component.poster.download.useMutation()
  const downloadAllEpisode = api.component.poster.downloadAll.useMutation()
  const episodeList = api.component.poster.episodeList.useQuery(anime.id, {
    enabled: shouldQuery,
  })

  const poster = (
    <Image
      src={anime.id}
      style={{ viewTransitionName: `anime-poster-${anime.id}` }}
      className={
        (small ? 'h-[229px] max-w-[162px]' : 'h-[318px] max-w-[225px]') +
        ' rounded-md object-cover shadow outline outline-1 outline-slate-600/20'
      }
    />
  )

  const animeId = anime.id.toString()

  const downloadAll = () => {
    const { dismiss } = toast({ title: 'Mulai mengunduh semua episode ' + anime.title })

    downloadAllEpisode.mutate(anime.id, {
      onSuccess(count) {
        dismiss()

        const t = toast({
          title: `${count} episode ${anime.title} sedang dalam proses unduh`,
          action: <SeeDownloadAction toast={() => t} />,
        })
      },
    })
  }

  return (
    <ContextMenu onOpenChange={setShouldQuery}>
      <ContextMenuTrigger asChild>
        <div className={`relative block transition-all hover:scale-105 ${className}`}>
          {asLink ? (
            <Link to="/anime/$id" params={{ id: animeId }} tabIndex={tabIndex}>
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
        {/* <ContextMenuItem>Nonton Nanti</ContextMenuItem> */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>Nonton</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {/* <ContextMenuItem>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              Lanjut
            </ContextMenuItem>
            <ContextMenuSeparator /> */}
            <MapTrpc
              query={episodeList}
              onLoading={() => <ContextMenuItem>Memuat...</ContextMenuItem>}
              onEmpty={() => <ContextMenuItem>Belum ada episode yang rilis</ContextMenuItem>}
              cb={([episode]) => (
                <ContextMenuItem key={episode} asChild>
                  <Link
                    to="/anime/$id/episode/$number"
                    params={{ id: animeId, number: episode.toString() }}
                  >
                    Episode {episode}
                  </Link>
                </ContextMenuItem>
              )}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Unduh</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {!episodeList.data ? (
              <ContextMenuItem>Memuat...</ContextMenuItem>
            ) : episodeList.data.every(([, isDownloadCompleted]) => isDownloadCompleted) ? (
              <ContextMenuItem>Semua episode sudah terunduh</ContextMenuItem>
            ) : (
              <>
                <ContextMenuItem onClick={downloadAll} role="button" className="cursor-pointer">
                  Semua
                </ContextMenuItem>
                <ContextMenuSeparator />
                <MapArray
                  data={episodeList.data}
                  cb={([episode, isDownloadCompleted]) => {
                    if (isDownloadCompleted) {
                      return null
                    }

                    const download = () => {
                      const partialTitle = `${anime.title} episode ${episode}`
                      const { dismiss } = toast({
                        title: `${isDownloadCompleted === false ? 'Lanjut' : 'Mulai'} mengunduh ${partialTitle}`,
                      })

                      downloadEpisode.mutate(
                        {
                          animeId: anime.id,
                          episodeNumber: episode,
                        },
                        {
                          onSuccess(result) {
                            if (result) {
                              if (result.size) {
                                const t = toast({
                                  title: 'Sedang mengunduh ' + partialTitle,
                                  description: 'Ukuran file: ' + result.size,
                                  action: <SeeDownloadAction toast={() => t} />,
                                })
                              } else {
                                const t = toast({
                                  title: partialTitle + ' telah ditambahkan ke antrian unduhan',
                                  action: <SeeDownloadAction toast={() => t} />,
                                })
                              }
                            } else {
                              const { dismiss } = toast({
                                title: partialTitle + ' sudah terunduh',
                                action: (
                                  <ToastAction altText="Nonton">
                                    <Link
                                      to="/anime/$id/episode/$number"
                                      params={{ id: animeId, number: episode.toString() }}
                                      onClick={() => {
                                        dismiss()
                                      }}
                                    >
                                      Nonton
                                    </Link>
                                  </ToastAction>
                                ),
                              })
                            }

                            dismiss()
                          },
                        },
                      )
                    }

                    return (
                      <ContextMenuItem
                        key={episode}
                        onClick={download}
                        role="button"
                        className="cursor-pointer"
                      >
                        Episode {episode}
                      </ContextMenuItem>
                    )
                  }}
                />
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function SeeDownloadAction({
  toast,
}: {
  toast: () => ReturnType<ReturnType<typeof useToast>['toast']>
}) {
  return (
    <ToastAction altText="Lihat unduhan">
      <Link
        to="/pengaturan/unduhan"
        onClick={() => {
          toast().dismiss()
        }}
      >
        Lihat unduhan
      </Link>
    </ToastAction>
  )
}
