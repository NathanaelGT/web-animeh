export const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const

export const formatBytes = (bytes: number) => {
  let i = 0
  while (bytes > 999) {
    bytes /= 1024
    i++
  }

  return bytes.toFixed(2) + ' ' + units[i]
}
