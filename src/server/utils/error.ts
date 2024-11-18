export const getStackTraces = (error: Error) => {
  const inspect = Bun.inspect(error)

  return inspect
    .slice(inspect.lastIndexOf('^\n') + '^\n'.length, -1)
    .split('\n')
    .slice(1)
}

export const isOffline = (error: unknown) => {
  return (
    error instanceof Error &&
    (error.name === 'FailedToOpenSocket' || error.name === 'ConnectionRefused')
  )
}
