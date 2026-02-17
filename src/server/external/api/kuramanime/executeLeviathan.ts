import vm from 'vm'
import { LeviathanExecutionError } from '~s/error'

export const executeLeviathan = (source: string) => {
  try {
    const fetch = (_input: undefined, init: { headers: { Authorization: string } }) => {
      return init.headers.Authorization.slice('Bearer '.length)
    }
    const window = {} as { fetchSecure(): Promise<ReturnType<typeof fetch>> }

    vm.runInNewContext(
      source,
      { window, fetch },
      {
        timeout: 1000,
        microtaskMode: 'afterEvaluate',
        contextCodeGeneration: { strings: false, wasm: false },
      },
    )

    return window.fetchSecure()
  } catch (error) {
    let message = 'Failed to execute Leviathan code'
    if (error instanceof Error) {
      if ((error as any).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        message += `: Leviathan execution timeout`
      } else {
        message += `: ${error.message}`
      }
    }

    throw new LeviathanExecutionError(message, { cause: error })
  }
}
