import { memo } from 'react'
import { useRouter } from '@tanstack/react-router'
import { rpc } from '~c/trpc'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { EpisodeStateIcon } from '@/ui/custom/episode-state-icon'
import { DownloadDropdown } from './DownloadDropdown'
import * as downloadText from '~/shared/anime/episode/downloadText'
import type { DownloadProgressDataWithoutDone } from '~s/db/repository/episode'
import type { DownloadMeta } from '~s/external/download/meta'

type Props = {
  name: string
  data: DownloadProgressDataWithoutDone
}

const Title = memo(function Title({ name }: Pick<Props, 'name'>) {
  const router = useRouter()

  let promise: Promise<DownloadMeta | undefined> | undefined

  return (
    <div className="my-auto flex-1">
      <span
        onMouseDown={() => {
          promise ??= rpc.download.meta.query(name)
        }}
        onClick={async () => {
          promise ??= rpc.download.meta.query(name)

          const meta = await promise
          if (meta) {
            router.navigate({
              to: '/anime/$id/episode/$number',
              params: {
                id: meta.animeId.toString(),
                number: meta.episodeNumber.toString(),
              },
            })
          }
        }}
        className="cursor-pointer"
      >
        {name}
      </span>
    </div>
  )
})

export function DownloadState({ name, data }: Props) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-4">
        <div className="my-auto w-6">
          <EpisodeStateIcon data={data} />
        </div>

        <Title name={name} />

        {data.text !== downloadText.OPTIMIZING && data.text !== downloadText.FINISH && (
          <DownloadDropdown downloadName={name} />
        )}
      </div>

      {data.status === 'DOWNLOADING' ? (
        <DownloadProgress progress={data.progress} text={data.text} />
      ) : (
        <p className="text-center">{data.text}</p>
      )}
    </div>
  )
}
