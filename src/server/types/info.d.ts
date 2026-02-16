type InfoJson = typeof import('info.json')
type Info = {
  [K in keyof InfoJson]: InfoJson[K]['v']
}

declare module 'bun' {
  interface Env extends Info {
    PROD: boolean
    // Auto generated info start
    VERSION: string
    BUILD_NUMBER: string
    BUILD: string
    COMPILED: string
    SERVER_TYPE: string
    // Auto generated info end
  }
}
