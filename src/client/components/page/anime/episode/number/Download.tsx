import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useStore } from '@tanstack/react-store'
import { api } from '~c/trpc'
import { animeDataStore } from '~c/stores'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { combineFunction } from '~/shared/utils/function'
import { Button } from '@/ui/button'

type Props = {
  params: {
    id: string
    number: string
  }
  isPending?: boolean
  setStreamingUrl: Dispatch<SetStateAction<string | undefined>>
}

export function Download({ params, isPending, setStreamingUrl }: Props) {
  const [placeholder, setPlaceholder] = useState('')
  const animeData = useStore(animeDataStore)
  const downloadEpisode = api.component.poster.download.useMutation()
  const streamingEpisode = api.component.poster.streaming.useMutation()

  const requestDownload = () => {
    setPlaceholder('Memuat unduhan')

    downloadEpisode.mutate(
      { animeId: Number(params.id), episodeNumber: Number(params.number) },
      {
        onSuccess(result) {
          if (result?.size === '') {
            setPlaceholder(`Episode ${params.number} telah ditambahkan ke antrian unduhan`)
          }
        },
      },
    )
  }

  const requestStreaming = () => {
    setPlaceholder('Memuat link streaming')

    streamingEpisode.mutate(
      { animeId: Number(params.id), episodeNumber: Number(params.number) },
      {
        onSuccess: setStreamingUrl,
      },
    )
  }

  useEffect(() => {
    return combineFunction(
      createKeybindHandler('watchPage', 'download', () => {
        if (!placeholder) {
          requestDownload()
        }
      }),

      createKeybindHandler('watchPage', 'streaming', () => {
        if (!placeholder) {
          requestStreaming()
        }
      }),
    )
  }, [placeholder])

  if (placeholder) {
    return (
      <div className="m-auto">
        <p>{placeholder}</p>
      </div>
    )
  }

  const title = animeData.totalEpisodes === 1 ? animeData.title : 'Episode ' + params.number

  return (
    <div className="p-auto m-4 flex w-full flex-col items-center justify-center gap-3">
      <p className="text-center">
        {title} belum{isPending ? ' selesai' : ''} diunduh
      </p>
      <div className="grid w-full max-w-96 grid-cols-2 gap-4">
        <Button onClick={requestDownload} variant="indigo" size="sm" className="font-bold">
          {isPending ? 'Lanjutkan Unduhan' : 'Unduh'}
        </Button>
        <Button onClick={requestStreaming} variant="secondary" size="sm" className="font-bold">
          Streaming
        </Button>
      </div>
    </div>
  )
}
