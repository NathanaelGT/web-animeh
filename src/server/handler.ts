import Bun from 'bun'
import path from 'path'
import fs from 'fs/promises'
import { createBunWSHandler } from 'trpc-bun-adapter'
import { createTRPCContext } from '~s/trpc'
import { TRPCRouter } from '~s/router'
// import { safePath } from '~s/utils/path'
import { handleWebsocketRequest } from '~s/http-handler/websocket'
import { isProduction } from '~s/env' with { type: 'macro' }

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

export const httpHandler = async (
  request: Request,
  server: Bun.Server,
): Promise<undefined | Response> => {
  if (request.headers.get('upgrade') === 'websocket') {
    if (await handleWebsocketRequest(request, server)) {
      return
    }
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
