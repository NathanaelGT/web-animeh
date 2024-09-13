import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { clientProfileSettingsStore } from '~c/stores'
import { keybindGroupTranslation, keybindTranslation } from '~c/keybind'
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
  const keybindGroupList = useStore(clientProfileSettingsStore, settings => {
    const keybindGroupList: KeybindGroup[] = []

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
      }

      keybindGroupList.push({ title, description, keybinds })
    }

    return keybindGroupList
  })

  return (
    <div className="space-y-4 py-2 pb-4">
      {keybindGroupList.map((keybindGroup, index) => (
        <Card key={index} className="relative">
          <CardHeader
            data-subs-header="top-16"
            className="sticky top-0 rounded-t-lg border-b bg-card py-4 transition-[top]"
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
