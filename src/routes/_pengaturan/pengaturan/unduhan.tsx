import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DownloadIcon, Wand, Hourglass, CircleCheckBig, LoaderCircle } from 'lucide-react'
import { api } from '~c/trpc'
import { MapArray } from '@/logic/MapArray'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { OptimalizationProgress } from '@/ui/custom/optimalization-progress'
import { DownloadDropdown } from '@/page/pengaturan/unduhan/DownloadDropdown'

export const Route = createFileRoute('/_pengaturan/pengaturan/unduhan')({
  component: PengaturanUnduhan,
})

function PengaturanUnduhan() {
  const [downloadList, setDownloadList] = useState<[string, string][] | undefined>()

  api.download.list.useSubscription(undefined, {
    onData(data) {
      setDownloadList(Object.entries(data))
    },
  })

  return (
    <div className="space-y-4 py-2 pb-4 lg:max-w-2xl">
      <div className="grid gap-y-6">
        <h2 className="text-lg font-bold">Daftar Unduhan</h2>

        {!downloadList ? (
          <p>Sedang memuat...</p>
        ) : (
          <MapArray
            data={downloadList}
            onEmpty={() => 'Sedang tidak mengunduh apapun'}
            cb={([name, text]) => {
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
            }}
          />
        )}
      </div>
    </div>
  )
}
