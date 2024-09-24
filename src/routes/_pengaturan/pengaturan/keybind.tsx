import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { clientProfileSettingsStore } from '~c/stores'
import { keybindGroupTranslation, keybindTranslation } from '~c/keybind'
import { globalKeydownHandlerState, shouldSkipEvent } from '~c/utils/eventHandler'
import { captureKeybindFromEvent } from '~c/utils/keybind'
import { KeybindSetting } from '@/page/pengaturan/keybind/KeybindSetting'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/_pengaturan/pengaturan/keybind')({
  component: PengaturanKeybind,
})

type KeybindGroup = {
  title: NonNullable<ReactNode>
  description: NonNullable<ReactNode>
  keybinds: Parameters<typeof KeybindSetting>[0][]
}

function PengaturanKeybind() {
  const [keybindGroupList, keybindCombinationMap] = useStore(
    clientProfileSettingsStore,
    settings => {
      const keybindGroupList: KeybindGroup[] = []
      const keybindCombinationMap = new Map<string, string[]>()

      for (const group in keybindTranslation) {
        type G = keyof typeof keybindGroupTranslation

        const [title, description] = keybindGroupTranslation[group as G]

        const keybinds: KeybindGroup['keybinds'] = []

        for (const keybindKey in settings.keybind[group as G]) {
          // @ts-ignore
          const combination = settings.keybind[group as G][keybindKey] as string[]

          // @ts-ignore
          const [name, note] = keybindTranslation[group as G][keybindKey] as
            | [string]
            | [string, string]

          keybinds.push({
            group,
            keybindKey,
            name,
            note,
            combination,
          })

          const key = combination.join('___')
          const existingKeybind = keybindCombinationMap.get(key)
          const id = `${group}_${keybindKey}`
          if (existingKeybind) {
            existingKeybind.push(id)
          } else {
            keybindCombinationMap.set(key, [id])
          }
        }

        keybindGroupList.push({ title, description, keybinds })
      }

      return [keybindGroupList, keybindCombinationMap] as const
    },
  )

  useEffect(() => {
    globalKeydownHandlerState.enabled = false

    const handler = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) {
        return
      }

      const combinationKey = captureKeybindFromEvent(event).join('___')

      const keybindKeys = keybindCombinationMap.get(combinationKey)
      if (!keybindKeys?.length) {
        return
      }

      let index = 0

      const activeId = document.activeElement?.id
      if (activeId?.startsWith('keybind_')) {
        const activeKey = activeId.slice('keybind_'.length)

        index = keybindKeys.indexOf(activeKey) + 1
      }

      const element = document.getElementById(`keybind_${keybindKeys[index] ?? keybindKeys[0]}`)
      if (element) {
        event.preventDefault()
        element.focus()
      }
    }

    document.body.addEventListener('keydown', handler)

    return () => {
      globalKeydownHandlerState.enabled = true

      document.body.removeEventListener('keydown', handler)
    }
  }, [keybindCombinationMap])

  return (
    <div className="space-y-4 py-2 pb-4">
      {keybindGroupList.map((keybindGroup, index) => (
        <Card key={index} className="relative">
          <CardHeader
            data-subs-header="top-16"
            className="sticky top-0 z-10 rounded-t-lg border-b bg-card py-4 transition-[top]"
          >
            <CardTitle className="text-xl">{keybindGroup.title}</CardTitle>
            {keybindGroup.description && (
              <CardDescription>{keybindGroup.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {keybindGroup.keybinds.map((keybind, index) => (
              <KeybindSetting key={index} {...keybind} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
