/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as PengaturanImport } from './routes/_pengaturan'
import { Route as IndexImport } from './routes/index'
import { Route as AnimeIdImport } from './routes/anime/_$id'
import { Route as PengaturanPengaturanIndexImport } from './routes/_pengaturan/pengaturan/index'
import { Route as PengaturanPengaturanUnduhanImport } from './routes/_pengaturan/pengaturan/unduhan'
import { Route as PengaturanPengaturanTampilanImport } from './routes/_pengaturan/pengaturan/tampilan'
import { Route as PengaturanPengaturanPemutarVideoImport } from './routes/_pengaturan/pengaturan/pemutar-video'
import { Route as PengaturanPengaturanKeybindImport } from './routes/_pengaturan/pengaturan/keybind'
import { Route as AnimeIdIdIndexImport } from './routes/anime/_$id/$id/index'
import { Route as AnimeIdIdEpisodeImport } from './routes/anime/_$id/$id/_episode'
import { Route as AnimeIdIdEpisodeEpisodeNumberImport } from './routes/anime/_$id/$id/_episode/episode/$number'

// Create Virtual Routes

const AnimeImport = createFileRoute('/anime')()
const AnimeIdIdImport = createFileRoute('/anime/_$id/$id')()

// Create/Update Routes

const AnimeRoute = AnimeImport.update({
  path: '/anime',
  getParentRoute: () => rootRoute,
} as any)

const PengaturanRoute = PengaturanImport.update({
  id: '/_pengaturan',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AnimeIdRoute = AnimeIdImport.update({
  id: '/_$id',
  getParentRoute: () => AnimeRoute,
} as any)

const AnimeIdIdRoute = AnimeIdIdImport.update({
  path: '/$id',
  getParentRoute: () => AnimeIdRoute,
} as any)

const PengaturanPengaturanIndexRoute = PengaturanPengaturanIndexImport.update({
  path: '/pengaturan/',
  getParentRoute: () => PengaturanRoute,
} as any)

const PengaturanPengaturanUnduhanRoute =
  PengaturanPengaturanUnduhanImport.update({
    path: '/pengaturan/unduhan',
    getParentRoute: () => PengaturanRoute,
  } as any)

const PengaturanPengaturanTampilanRoute =
  PengaturanPengaturanTampilanImport.update({
    path: '/pengaturan/tampilan',
    getParentRoute: () => PengaturanRoute,
  } as any)

const PengaturanPengaturanPemutarVideoRoute =
  PengaturanPengaturanPemutarVideoImport.update({
    path: '/pengaturan/pemutar-video',
    getParentRoute: () => PengaturanRoute,
  } as any)

const PengaturanPengaturanKeybindRoute =
  PengaturanPengaturanKeybindImport.update({
    path: '/pengaturan/keybind',
    getParentRoute: () => PengaturanRoute,
  } as any)

const AnimeIdIdIndexRoute = AnimeIdIdIndexImport.update({
  path: '/',
  getParentRoute: () => AnimeIdIdRoute,
} as any)

const AnimeIdIdEpisodeRoute = AnimeIdIdEpisodeImport.update({
  id: '/_episode',
  getParentRoute: () => AnimeIdIdRoute,
} as any)

const AnimeIdIdEpisodeEpisodeNumberRoute =
  AnimeIdIdEpisodeEpisodeNumberImport.update({
    path: '/episode/$number',
    getParentRoute: () => AnimeIdIdEpisodeRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_pengaturan': {
      id: '/_pengaturan'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof PengaturanImport
      parentRoute: typeof rootRoute
    }
    '/anime': {
      id: '/anime'
      path: '/anime'
      fullPath: '/anime'
      preLoaderRoute: typeof AnimeImport
      parentRoute: typeof rootRoute
    }
    '/anime/_$id': {
      id: '/anime/_$id'
      path: '/anime'
      fullPath: '/anime'
      preLoaderRoute: typeof AnimeIdImport
      parentRoute: typeof AnimeRoute
    }
    '/_pengaturan/pengaturan/keybind': {
      id: '/_pengaturan/pengaturan/keybind'
      path: '/pengaturan/keybind'
      fullPath: '/pengaturan/keybind'
      preLoaderRoute: typeof PengaturanPengaturanKeybindImport
      parentRoute: typeof PengaturanImport
    }
    '/_pengaturan/pengaturan/pemutar-video': {
      id: '/_pengaturan/pengaturan/pemutar-video'
      path: '/pengaturan/pemutar-video'
      fullPath: '/pengaturan/pemutar-video'
      preLoaderRoute: typeof PengaturanPengaturanPemutarVideoImport
      parentRoute: typeof PengaturanImport
    }
    '/_pengaturan/pengaturan/tampilan': {
      id: '/_pengaturan/pengaturan/tampilan'
      path: '/pengaturan/tampilan'
      fullPath: '/pengaturan/tampilan'
      preLoaderRoute: typeof PengaturanPengaturanTampilanImport
      parentRoute: typeof PengaturanImport
    }
    '/_pengaturan/pengaturan/unduhan': {
      id: '/_pengaturan/pengaturan/unduhan'
      path: '/pengaturan/unduhan'
      fullPath: '/pengaturan/unduhan'
      preLoaderRoute: typeof PengaturanPengaturanUnduhanImport
      parentRoute: typeof PengaturanImport
    }
    '/_pengaturan/pengaturan/': {
      id: '/_pengaturan/pengaturan/'
      path: '/pengaturan'
      fullPath: '/pengaturan'
      preLoaderRoute: typeof PengaturanPengaturanIndexImport
      parentRoute: typeof PengaturanImport
    }
    '/anime/_$id/$id': {
      id: '/anime/_$id/$id'
      path: '/$id'
      fullPath: '/anime/$id'
      preLoaderRoute: typeof AnimeIdIdImport
      parentRoute: typeof AnimeIdImport
    }
    '/anime/_$id/$id/_episode': {
      id: '/anime/_$id/$id/_episode'
      path: '/$id'
      fullPath: '/anime/$id'
      preLoaderRoute: typeof AnimeIdIdEpisodeImport
      parentRoute: typeof AnimeIdIdRoute
    }
    '/anime/_$id/$id/': {
      id: '/anime/_$id/$id/'
      path: '/'
      fullPath: '/anime/$id/'
      preLoaderRoute: typeof AnimeIdIdIndexImport
      parentRoute: typeof AnimeIdIdImport
    }
    '/anime/_$id/$id/_episode/episode/$number': {
      id: '/anime/_$id/$id/_episode/episode/$number'
      path: '/episode/$number'
      fullPath: '/anime/$id/episode/$number'
      preLoaderRoute: typeof AnimeIdIdEpisodeEpisodeNumberImport
      parentRoute: typeof AnimeIdIdEpisodeImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  PengaturanRoute: PengaturanRoute.addChildren({
    PengaturanPengaturanKeybindRoute,
    PengaturanPengaturanPemutarVideoRoute,
    PengaturanPengaturanTampilanRoute,
    PengaturanPengaturanUnduhanRoute,
    PengaturanPengaturanIndexRoute,
  }),
  AnimeRoute: AnimeRoute.addChildren({
    AnimeIdRoute: AnimeIdRoute.addChildren({
      AnimeIdIdRoute: AnimeIdIdRoute.addChildren({
        AnimeIdIdEpisodeRoute: AnimeIdIdEpisodeRoute.addChildren({
          AnimeIdIdEpisodeEpisodeNumberRoute,
        }),
        AnimeIdIdIndexRoute,
      }),
    }),
  }),
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/_pengaturan",
        "/anime"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/_pengaturan": {
      "filePath": "_pengaturan.tsx",
      "children": [
        "/_pengaturan/pengaturan/keybind",
        "/_pengaturan/pengaturan/pemutar-video",
        "/_pengaturan/pengaturan/tampilan",
        "/_pengaturan/pengaturan/unduhan",
        "/_pengaturan/pengaturan/"
      ]
    },
    "/anime": {
      "filePath": "anime",
      "children": [
        "/anime/_$id"
      ]
    },
    "/anime/_$id": {
      "filePath": "anime/_$id.tsx",
      "parent": "/anime",
      "children": [
        "/anime/_$id/$id"
      ]
    },
    "/_pengaturan/pengaturan/keybind": {
      "filePath": "_pengaturan/pengaturan/keybind.tsx",
      "parent": "/_pengaturan"
    },
    "/_pengaturan/pengaturan/pemutar-video": {
      "filePath": "_pengaturan/pengaturan/pemutar-video.tsx",
      "parent": "/_pengaturan"
    },
    "/_pengaturan/pengaturan/tampilan": {
      "filePath": "_pengaturan/pengaturan/tampilan.tsx",
      "parent": "/_pengaturan"
    },
    "/_pengaturan/pengaturan/unduhan": {
      "filePath": "_pengaturan/pengaturan/unduhan.tsx",
      "parent": "/_pengaturan"
    },
    "/_pengaturan/pengaturan/": {
      "filePath": "_pengaturan/pengaturan/index.tsx",
      "parent": "/_pengaturan"
    },
    "/anime/_$id/$id": {
      "filePath": "anime/_$id/$id",
      "parent": "/anime/_$id",
      "children": [
        "/anime/_$id/$id/_episode",
        "/anime/_$id/$id/"
      ]
    },
    "/anime/_$id/$id/_episode": {
      "filePath": "anime/_$id/$id/_episode.tsx",
      "parent": "/anime/_$id/$id",
      "children": [
        "/anime/_$id/$id/_episode/episode/$number"
      ]
    },
    "/anime/_$id/$id/": {
      "filePath": "anime/_$id/$id/index.tsx",
      "parent": "/anime/_$id/$id"
    },
    "/anime/_$id/$id/_episode/episode/$number": {
      "filePath": "anime/_$id/$id/_episode/episode/$number.tsx",
      "parent": "/anime/_$id/$id/_episode"
    }
  }
}
ROUTE_MANIFEST_END */
