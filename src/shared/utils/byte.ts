export const formatBytes = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  if (bytes === 0) {
    return '0 B'
  }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1e3)).toString(), 10)

  return `${(bytes / Math.pow(1e3, i)).toFixed(2)} ${sizes[i]}`
}
