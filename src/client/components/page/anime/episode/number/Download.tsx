import { useState } from 'react'
import { api } from '~c/trpc'
import { Button } from '@/ui/button'

type Props = {
  animeId: number
  episodeNumber: number
}

export function Download(props: Props) {
  const [placeholder, setPlaceholder] = useState('')
  const downloadEpisode = api.component.poster.download.useMutation()

  if (placeholder) {
    return (
      <div className="m-auto">
        <p>{placeholder}</p>
      </div>
    )
  }

  return (
    <div className="m-auto flex flex-col gap-3">
      <p>Episode {props.episodeNumber} belum terunduh</p>
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
        className="font-bold"
      >
        Unduh
      </Button>
    </div>
  )
}
