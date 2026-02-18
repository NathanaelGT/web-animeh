import { createBunWSHandler } from 'trpc-bun-adapter'
import { handleVideoRequest } from '~s/http-handler/video'
// import { safePath } from '~s/utils/path'
import { handleWebsocketRequest } from '~s/http-handler/websocket'
import { TRPCRouter } from '~s/router'
import { createTRPCContext } from '~s/trpc'
import { basePath } from '~s/utils/path'
import type { WebSocketData } from './index'

let indexHtml: ArrayBuffer

if (Bun.env.PROD || Bun.argv.includes('--server-only')) {
  // ada kemungkinan kecil race condition, tapi ga masalah
  void Bun.file(basePath + 'dist/public/index.html')
    .arrayBuffer()
    .then(html => {
      indexHtml = html
    })
}

export const websocket = createBunWSHandler({
  router: TRPCRouter,
  createContext: createTRPCContext as () => ReturnType<typeof createTRPCContext>,
  allowBatching: false,
}) as unknown as Bun.WebSocketHandler<WebSocketData>

export const httpHandler = async (
  request: Request,
  server: Bun.Server<WebSocketData>,
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

  if (!Bun.env.PROD && !Bun.argv.includes('--server-only')) {
    return Response.redirect(`http://localhost:8888/${path}`, 302)
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
