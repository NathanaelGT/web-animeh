export const extension = (path: string) => path.slice(path.lastIndexOf('.') + 1)

export const withoutExtension = (path: string) => path.slice(0, path.lastIndexOf('.'))

export const dir = (path: string) => path.slice(0, path.lastIndexOf('/'))
