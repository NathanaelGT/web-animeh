import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { DownloadDropdown } from '@/page/pengaturan/unduhan/DownloadDropdown'

export const Route = createFileRoute('/_pengaturan/pengaturan/unduhan/')({
  component: PengaturanUnduhan,
  pendingComponent: () => <p>Sedang memuat...</p>,
  loader: () => fetchRouteData('/pengaturan/unduhan'),
})

function PengaturanUnduhan() {
  const initialDownloadList = Route.useLoaderData()
  const [downloadList, setDownloadList] = useState(initialDownloadList)

  api.download.list.useSubscription(undefined, {
    onData(data) {
      setDownloadList(Object.entries(data))
    },
  })

  if (!downloadList.length) {
    return <p>Sedang tidak mengunduh apapun</p>
  }

  return downloadList.map(([name, text]) => {
    const isDownloading = text.startsWith('Mengunduh: ')
    const isOptimizing = !isDownloading && text.startsWith('Mengoptimalisasi video')

    return (
      <div key={name} className="grid gap-3">
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

          <p className="my-auto flex-1">{name}</p>

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
  })
}
