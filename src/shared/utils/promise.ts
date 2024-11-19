export const timeoutPromise = (ms: number) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}
