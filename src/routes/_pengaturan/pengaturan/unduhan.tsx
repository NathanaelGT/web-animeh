import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '~c/trpc'
import { MapArray } from '@/logic/MapArray'
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
                <p className="flex whitespace-pre">
                  {text.match(/\d+|\D+/g)?.map((chars, index) => {
                    const asciiCode = chars.codePointAt(0)!
                    // untuk angka, diset widthnya 1ch biar engga gerak"
                    if (asciiCode >= 48 && asciiCode <= 57) {
                      return (
                        <span
                          key={index}
                          style={{ width: chars.length + 'ch' }}
                          className="inline-block"
                        >
                          {chars}
                        </span>
                      )
                    }

                    return <span key={index}>{chars}</span>
                  })}
                </p>
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
