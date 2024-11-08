import { memo } from 'react'
import { useRouter } from '@tanstack/react-router'
import { DownloadIcon, Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { rpc } from '~c/trpc'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { DownloadDropdown } from './DownloadDropdown'
import type { DownloadMeta } from '~s/external/download/meta'

type Props = {
  name: string
  text: string
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
export function DownloadState({ name, text }: Props) {
  const isDownloading = text.startsWith('Mengunduh: ')
  const isOptimizing = !isDownloading && text.startsWith('Mengoptimalisasi video')

  return (
    <div className="grid gap-3">
      <div className="flex gap-4">
        <div className="my-auto w-6">
          {isDownloading ? (
            <DownloadIcon />
          ) : isOptimizing ? (
            <Wand />
          ) : text.startsWith('Menunggu') ? (
            <Hourglass />
          ) : text === 'Video selesai diunduh' ? (
            <CircleCheckBig />
          ) : (
            <LoaderCircle className="animate-spin" />
          )}
        </div>

        <Title name={name} />

        {!isOptimizing && <DownloadDropdown downloadName={name} />}
      </div>

      {isDownloading ? (
        <DownloadProgress text={text} />
      ) : isOptimizing ? (
        <OptimalizationProgress text={text}>
          <p className="text-center">Mengoptimalisasi video</p>
        </OptimalizationProgress>
      ) : (
        <p>{text}</p>
      )}
    </div>
  )
}
