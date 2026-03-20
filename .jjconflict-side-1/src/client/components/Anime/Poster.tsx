import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '~c/trpc'
import { Image } from '@/Image'
import { MapArray } from '@/logic/MapArray'
import { MapTrpc } from '@/logic/MapTrpc'
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
import { ToastAction } from '@/ui/toast'
import { useToast } from '@/ui/use-toast'
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
        (small ? 'h-[229px] w-[162px]' : 'h-[318px] w-[225px]') +
        ' rounded-md bg-muted object-cover shadow-sm outline-1 outline-slate-600/20 outline-solid'
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
              cb={({ number }) => (
                <ContextMenuItem key={number} asChild>
                  <Link
                    to="/anime/$id/episode/$number"
                    params={{ id: animeId, number: number.toString() }}
                  >
                    Episode {number}
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
            ) : episodeList.data.every(
                ({ download: { status } }) => status !== 'NOT_DOWNLOADED' && status !== 'RESUME',
              ) ? (
              <ContextMenuItem>Semua episode sudah terunduh</ContextMenuItem>
            ) : (
              <>
                <ContextMenuItem onClick={downloadAll} role="button" className="cursor-pointer">
                  Semua
                </ContextMenuItem>
                <ContextMenuSeparator />
                <MapArray
                  data={episodeList.data}
                  cb={({ number, download }) => {
                    if (!(download.status === 'NOT_DOWNLOADED' || download.status === 'RESUME')) {
                      return null
                    }

                    const startDownload = () => {
                      const partialTitle = `${anime.title} episode ${number}`
                      const { dismiss } = toast({
                        title: `${download.status === 'RESUME' ? 'Lanjut' : 'Mulai'} mengunduh ${partialTitle}`,
                      })

                      downloadEpisode.mutate(
                        {
                          animeId: anime.id,
                          episodeNumber: number,
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
                                      params={{ id: animeId, number: number.toString() }}
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
                        key={number}
                        onClick={startDownload}
                        role="button"
                        className="cursor-pointer"
                      >
                        Episode {number}
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
