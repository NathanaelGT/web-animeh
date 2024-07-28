import Bun from 'bun'
import path from 'path'
import fs from 'fs/promises'
import { createBunWSHandler } from 'trpc-bun-adapter'
import { createTRPCContext } from '~s/trpc'
import { TRPCRouter } from '~s/router'
// import { safePath } from '~s/utils/path'
import { db } from './db'
import { profiles, type Profile } from '~s/db/schema'
import { defaultSettings, parse } from '~s/profile/settings'
import { isProduction } from '~s/env' with { type: 'macro' }
import type { WebSocketData } from '~s/index'

let indexHtml: Buffer

if (isProduction()) {
  // ada kemungkinan kecil race condition, tapi ga masalah
  void fs.readFile(path.join(import.meta.dir, 'public/index.html')).then(html => {
    indexHtml = html
  })
}

export const websocket = createBunWSHandler({
  router: TRPCRouter,
  createContext: createTRPCContext as () => ReturnType<typeof createTRPCContext>,
  allowBatching: false,
})

const globalForId = globalThis as unknown as {
  id: number
}
if (!isProduction()) {
  globalForId.id ??= 1
}

let id = 1

export const httpHandler = (request: Request, server: Bun.Server): undefined | Response => {
  const upgradeSuccess = server.upgrade(request, {
    data: {
      id: (isProduction() ? id : globalForId.id).toString(36),
    } satisfies WebSocketData,
  })

  if (upgradeSuccess) {
    if (isProduction()) {
      id++
    } else {
      globalForId.id++
    }

    return
  }

  if (!isProduction()) {
    const target = request.url.slice(server.url.origin.length)

    return Response.redirect(`http://localhost:8888${target}`, 302)
  }

  // const file = Bun.file(safePath([import.meta.dir, 'public'], url))
  // if (await file.exists()) {
  //   return new Response(file)
  // }

  return new Response(indexHtml, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Content-Encoding': 'br',
    },
  })
}
