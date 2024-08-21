import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '~c/utils'
import { api } from '~c/trpc'
import { profileStore, clientProfileSettingsStore } from '~c/stores'
import { ucFirst } from '~/shared/utils/string'
import { headerPositions } from '~/shared/profile/settings'
import { Button } from '@/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '@/ui/command'
import { labelVariants } from '@/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover'

export const Route = createFileRoute('/_pengaturan/pengaturan/tampilan')({
  component: PengaturanTampilan,
})

function PengaturanTampilan() {
  const [settings, setSettings] = useState(clientProfileSettingsStore.state)
  const [headerPositionPopoverIsopen, setHeaderPositionPopoverIsOpen] = useState(false)
  const update = api.profile.update.useMutation()

  return (
    <div className="space-y-4 py-2 pb-4">
      <div className="grid space-y-2">
        <span className={labelVariants()}>Posisi header</span>
        <Popover open={headerPositionPopoverIsopen} onOpenChange={setHeaderPositionPopoverIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                'w-48 justify-between',
                settings.headerPosition && 'text-muted-foreground',
              )}
            >
              {ucFirst(settings.headerPosition)}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {headerPositions.map(position => (
                    <CommandItem
                      key={position}
                      onSelect={() => {
                        const newState = { ...profileStore.state! }
                        newState.settings!.headerPosition = position

                        setHeaderPositionPopoverIsOpen(false)
                        update.mutate(newState, {
                          onSuccess() {
                            setSettings(clientProfileSettingsStore.state)
                          },
                        })
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          settings.headerPosition === position ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {ucFirst(position)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
