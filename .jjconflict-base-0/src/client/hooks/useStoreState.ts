import { useState, useEffect } from 'react'
import type { AnyUpdater, Store } from '@tanstack/store'

export const useStoreState = <
  TState,
  TSelected = NoInfer<TState>,
  TUpdater extends AnyUpdater = AnyUpdater,
>(
  store: Store<TState, TUpdater>,
  selector: (state: NoInfer<TState>) => TSelected = state => state as unknown as TSelected,
) => {
  const hooks = useState<TSelected>(() => selector(store.state))

  useEffect(() => {
    return store.subscribe(() => {
      hooks[1](selector(store.state))
    })
  }, [store])

  return hooks
}
