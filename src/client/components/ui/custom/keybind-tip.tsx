import { useStore } from '@tanstack/react-store'
import { clientProfileSettingsStore, showKeybindTipsStore } from '~c/stores'
import { cn } from '~c/utils'
import { formatKeybind } from '~c/utils/keybind'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']

export function KeybindTip<TGroup extends keyof KeybindGroups>({
  id,
  className,
}: {
  id: [TGroup, keyof KeybindGroups[TGroup]]
  className?: string
}) {
  const show = useStore(showKeybindTipsStore)
  const keybind = useStore(clientProfileSettingsStore, state => {
    return (state.keybind[id[0]][id[1]] as string[]).map(formatKeybind).join(' ')
  })

  if (!keybind) {
    return <div />
  }

  return (
    <div
      className={cn(
        'min-w-5 whitespace-nowrap rounded-sm border p-1 text-center text-xs text-muted-foreground transition-opacity',
        className,
        show ? 'opacity-100' : 'opacity-0',
      )}
    >
      {keybind}
    </div>
  )
}
