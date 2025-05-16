import Bun from 'bun'
import fs from 'fs/promises'
import { createBunWSHandler } from 'trpc-bun-adapter'
import { createTRPCContext } from '~s/trpc'
import { TRPCRouter } from '~s/router'
import { basePath } from '~s/utils/path'
// import { safePath } from '~s/utils/path'
import { handleWebsocketRequest } from '~s/http-handler/websocket'
import { handleVideoRequest } from '~s/http-handler/video'
import { isProduction } from '~s/env' with { type: 'macro' }

let indexHtml: Buffer

if (isProduction() || Bun.argv.includes('--server-only')) {
  // ada kemungkinan kecil race condition, tapi ga masalah
  void fs.readFile(basePath + 'dist/public/index.html').then(html => {
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
  const path = new URL(request.url).pathname.substring(1)

  if (request.headers.get('upgrade') === 'websocket') {
    if (await handleWebsocketRequest(request, server, path)) {
      return
    }
  }

  if (path.startsWith('videos')) {
    return handleVideoRequest(request, path)
  }

  if (!isProduction() && !Bun.argv.includes('--server-only')) {
    return Response.redirect(`http://localhost:8888/${path}`, 302)
  }

  // const file = Bun.file(safePath([import.meta.dir, 'public'], url))
  // if (await file.exists()) {
  //   return new Response(file)
  // }

  return new Response(indexHtml, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Content-Encoding': 'gzip',
    },
  })
}
