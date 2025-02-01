import { useState, useEffect } from 'react'
import { useStore } from '@tanstack/react-store'
import { api } from '~c/trpc'
import { animeDataStore } from '~c/stores'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { Button } from '@/ui/button'

type Props = {
  params: {
    id: string
    number: string
  }
  isPending?: boolean
}

export function Download({ params, isPending }: Props) {
  const [placeholder, setPlaceholder] = useState('')
  const animeData = useStore(animeDataStore)
  const downloadEpisode = api.component.poster.download.useMutation()

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

  useEffect(() => {
    return createKeybindHandler('watchPage', 'download', () => {
      if (!placeholder) {
        requestDownload()
      }
    })
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
      <Button
        onClick={requestDownload}
        variant="indigo"
        size="sm"
        className="w-full max-w-96 font-bold"
      >
        {isPending ? 'Lanjutkan Unduhan' : 'Unduh'}
      </Button>
    </div>
  )
}
