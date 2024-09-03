import { useState, useContext } from 'react'
import { api } from '~c/trpc'
import { AnimeDataContext } from '~c/context'
import { Button } from '@/ui/button'

type Props = {
  animeId: number
  episodeNumber: number
  isPending: boolean
}

export function Download(props: Props) {
  const [placeholder, setPlaceholder] = useState('')
  const animeData = useContext(AnimeDataContext)
  const downloadEpisode = api.component.poster.download.useMutation()

  if (placeholder) {
    return (
      <div className="m-auto">
        <p>{placeholder}</p>
      </div>
    )
  }

  const title = animeData.totalEpisodes === 1 ? animeData.title : 'Episode ' + props.episodeNumber

  return (
    <div className="p-auto m-4 flex w-full flex-col items-center justify-center gap-3">
      <p className="text-center">
        {title} belum{props.isPending ? ' selesai' : ''} diunduh
      </p>
      <Button
        onClick={() => {
          setPlaceholder('Memuat unduhan')

          downloadEpisode.mutate(props, {
            onSuccess(result) {
              if (result?.size === '') {
                setPlaceholder(
                  `Episode ${props.episodeNumber} telah ditambahkan ke antrian unduhan`,
                )
              }
            },
          })
        }}
        variant="indigo"
        size="sm"
        className="w-full max-w-96 font-bold"
      >
        {props.isPending ? 'Lanjutkan Unduhan' : 'Unduh'}
      </Button>
    </div>
  )
}
