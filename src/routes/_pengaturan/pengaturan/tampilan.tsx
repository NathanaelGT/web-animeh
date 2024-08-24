import { useState } from 'react'
import { useStore } from '@tanstack/react-store'
import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronsUpDown } from 'lucide-react'
import { api } from '~c/trpc'
import { profileStore, clientProfileSettingsStore } from '~c/stores'
import { ucFirst } from '~/shared/utils/string'
import { themes, headerPositions } from '~/shared/profile/settings'
import { Button } from '@/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '@/ui/command'
import { labelVariants } from '@/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover'

export const Route = createFileRoute('/_pengaturan/pengaturan/tampilan')({
  component: PengaturanTampilan,
})

function PengaturanTampilan() {
  const settings = useStore(clientProfileSettingsStore)

  return (
    <div className="grid gap-y-4 py-2 pb-4">
      <Select
        label="Tema"
        options={themes}
        value={settings.theme}
        onChange={(settings, theme) => {
          settings.theme = theme
        }}
      />

      <Select
        label="Posisi header"
        options={headerPositions}
        value={settings.headerPosition}
        onChange={(settings, position) => {
          settings.headerPosition = position
        }}
      />
    </div>
  )
}

interface SelectProps<TOptions extends ReadonlyArray<string>> {
  label: string
  options: TOptions
  value: NoInfer<TOptions[number]>
  onChange: (
    settings: NonNullable<typeof profileStore.state>['settings'],
    newValue: NoInfer<TOptions[number]>,
  ) => void
}

function Select<TOptions extends ReadonlyArray<string>>({
  label,
  options,
  value,
  onChange,
}: SelectProps<TOptions>) {
  const [isOpen, setOpen] = useState(false)
  const update = api.profile.update.useMutation()

  return (
    <div className="grid gap-y-2">
      <span className={labelVariants()}>{label}</span>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-48 justify-between text-muted-foreground"
          >
            {ucFirst(value)}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {options.map(option => (
                  <CommandItem
                    key={option}
                    onSelect={() => {
                      const newState = { ...profileStore.state! }

                      onChange(newState.settings!, option)
                      update.mutate(newState)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={'mr-2 h-4 w-4 ' + (option === value ? 'opacity-100' : 'opacity-0')}
                    />
                    {ucFirst(option)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
