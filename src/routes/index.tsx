import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { fetchRouteData } from '~c/route'
import { logger } from '~c/utils'

export const Route = createFileRoute('/')({
  component: Index,
  loader: () => fetchRouteData('/'),
})

function Index() {
  const { serverDate } = Route.useLoaderData()
  const [firstRenderAt] = useState(Date.now)
  const router = useRouter()

  return (
    <div>
      <div className="m-2 flex flex-col gap-2">
        <div>
          <button
            onClick={() => router.invalidate()}
            className="rounded border border-slate-700 bg-slate-600 px-2 py-1 text-slate-100"
          >
            Refresh
          </button>
        </div>

        <div>
          <button
            onClick={() => {
              logger.info('hello world')
            }}
            className="rounded border border-slate-700 bg-slate-600 px-2 py-1 text-slate-100"
          >
            Log
          </button>
        </div>
      </div>

      <p>server render at: {(serverDate / 1000).toFixed(3)}</p>
      <p>client render at: {(firstRenderAt / 1000).toFixed(3)}</p>

      {Array.from({ length: 50 }).map((_, i) => (
        <p key={i}>yey</p>
      ))}
    </div>
  )
}
