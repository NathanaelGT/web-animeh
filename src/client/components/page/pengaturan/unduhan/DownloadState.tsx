import { memo } from 'react'
import { useRouter } from '@tanstack/react-router'
import { DownloadIcon, Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { rpc } from '~c/trpc'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { DownloadDropdown } from './DownloadDropdown'
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
          {data.status === 'DOWNLOADING' ? (
            <DownloadIcon />
          ) : data.status === 'OPTIMIZING' ? (
            <Wand />
          ) : data.text.startsWith('Menunggu') ? (
            <Hourglass />
          ) : data.text === 'Video selesai diunduh' ? (
            <CircleCheckBig />
          ) : (
            <LoaderCircle className="animate-spin" />
          )}
        </div>

        <Title name={name} />

        {data.status !== 'OPTIMIZING' && data.text !== 'Video selesai diunduh' && (
          <DownloadDropdown downloadName={name} />
        )}
      </div>

      {data.status === 'DOWNLOADING' ? (
        <DownloadProgress progress={data.progress} text={data.text} />
      ) : data.status === 'OPTIMIZING' ? (
        <OptimalizationProgress progress={data.progress}>
          <p className="text-center">Mengoptimalisasi video</p>
        </OptimalizationProgress>
      ) : (
        <p>{data.text}</p>
      )}
    </div>
  )
}
