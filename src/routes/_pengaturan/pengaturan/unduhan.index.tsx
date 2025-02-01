import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '~c/trpc'
import { fetchRouteData } from '~c/route'
import { MapObject } from '@/logic/MapObject'
import { DownloadState } from '@/page/pengaturan/unduhan/DownloadState'

export const Route = createFileRoute('/_pengaturan/pengaturan/unduhan/')({
  component: PengaturanUnduhan,
  pendingComponent: () => <p>Sedang memuat...</p>,
  loader: () => fetchRouteData('/pengaturan/unduhan'),
})

function PengaturanUnduhan() {
  const initialDownloadList = Route.useLoaderData()
  const [downloadList, setDownloadList] = useState(initialDownloadList)

  api.download.list.useSubscription(undefined, {
    onData: setDownloadList,
  })

  return MapObject({
    data: downloadList,
    onEmpty: () => <p>Sedang tidak mengunduh apapun</p>,
    cb: (data, name) => <DownloadState key={name} data={data} name={name} />,
  })
}
