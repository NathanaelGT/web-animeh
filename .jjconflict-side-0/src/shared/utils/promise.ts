import { TimeoutError } from '~/shared/error'
import { sleep } from './time'

export const timeout = <TReturn>(
  promise: Promise<TReturn>,
  ms: number,
): Promise<TReturn | void> => {
  return Promise.race([promise, sleep(ms)])
}

export const timeoutThrow = <TReturn>(promise: Promise<TReturn>, ms: number): Promise<TReturn> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError())
      }, ms)
    }),
  ])
}
