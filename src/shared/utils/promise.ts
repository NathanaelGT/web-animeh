import { TimeoutError } from '~/shared/error'

export const timeoutPromise = (ms: number) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

export const raceTimeoutPromise = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError())
      }, ms)
    }),
  ])
}
