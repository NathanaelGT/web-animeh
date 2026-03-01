type InfoJson = typeof import('info.json')
type Info = {
  [K in keyof InfoJson]: InfoJson[K]['v']
}

declare module 'bun' {
  interface Env extends Info {
    PROD: boolean
    HASH: string
    // Auto generated info start
    VERSION: string
    BUILD_NUMBER: string
    BUILD: string
    COMPILED: string
    SERVER_TYPE: string
    TIME_HOUR: number
    // Auto generated info end
  }
}
