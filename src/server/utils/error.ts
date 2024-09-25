export const getStackTraces = (error: Error) => {
  const inspect = Bun.inspect(error)

  return inspect
    .slice(inspect.lastIndexOf('^\n') + '^\n'.length, -1)
    .split('\n')
    .slice(1)
}
