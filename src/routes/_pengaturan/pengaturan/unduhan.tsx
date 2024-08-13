import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '~c/trpc'
import { MapArray } from '@/logic/MapArray'
import { DownloadProgress } from '@/ui/custom/download-progress'
import { Progress } from '@/ui/progress'

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
    <div className="space-y-4 py-2 pb-4">
      <div className="grid gap-y-4 md:w-2/3">
        <h2 className="text-lg font-bold">Daftar Unduhan</h2>

        {!downloadList ? (
          <p>Sedang memuat...</p>
        ) : (
          <MapArray
            data={downloadList}
            onEmpty={() => 'Sedang tidak mengunduh apapun'}
            cb={([name, text]) => (
              <div key={name}>
                <p>{name}</p>

                <DownloadProgress text={text} />

                {text.endsWith('%)') && (
                  <Progress value={Number(text.slice(text.indexOf('(') + 1, -2))} />
                )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}
