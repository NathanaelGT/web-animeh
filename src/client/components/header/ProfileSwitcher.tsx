import { useState, useEffect } from 'react'
import { useStore } from '@tanstack/react-store'
import { clientProfileNameStore } from '~c/stores'
import { Check, ChevronsUpDown } from 'lucide-react'
import { PlusCircledIcon } from '@radix-ui/react-icons'
import { cn } from '~c/utils'
import { Button } from '@/ui/button'
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover'
import { api } from '~c/trpc'
import type { ProfileRouter } from '~s/trpc-procedures/profile'
import type { TRPCResponse } from '~/shared/utils/types'

type Profiles = TRPCResponse<(typeof ProfileRouter)['list']>

export function ProfileSwitcher() {
  const [isOpen, setOpen] = useState(false)
  const [showNewProfileDialog, setShowNewProfileDialog] = useState(false)
  const [inputNameError, setInputNameError] = useState('')
  const currentProfileName = useStore(clientProfileNameStore)
  const [profiles, setProfiles] = useState<Profiles>(currentProfileName ? [currentProfileName] : [])
  const list = api.profile.list.useMutation()
  const change = api.profile.change.useMutation()
  const create = api.profile.create.useMutation()

  useEffect(() => {
    if (!showNewProfileDialog) {
      setInputNameError('')
    }
  }, [showNewProfileDialog, setInputNameError])

  const fetchProfiles = () => {
    list.mutate(undefined, {
      onSuccess(data) {
        setProfiles(data)
      },
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = new FormData(event.currentTarget).get('name')! as string

    if (name === '') {
      setInputNameError('Nama profil tidak boleh kosong')

      return
    } else if (profiles.includes(name)) {
      setInputNameError('Nama profil ini sudah digunakan')

      return
    }

    create.mutate(name)
    clientProfileNameStore.setState(() => name)
    setInputNameError('')
    setShowNewProfileDialog(false)
  }

  return (
    <Dialog open={showNewProfileDialog} onOpenChange={setShowNewProfileDialog}>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            aria-label="Select a team"
            onMouseDown={fetchProfiles}
            className="justify-between sm:w-48"
          >
            <span className="overflow-hidden">{currentProfileName ?? 'Loading'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 sm:w-48">
          <Command>
            <CommandList>
              <CommandGroup>
                {profiles.map(profileName => (
                  <CommandItem
                    key={profileName}
                    onSelect={() => {
                      if (currentProfileName !== profileName) {
                        change.mutate(profileName)
                      }
                      setOpen(false)
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        currentProfileName === profileName ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="overflow-hidden">{profileName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowNewProfileDialog(true)
                    }}
                  >
                    <PlusCircledIcon className="mr-2 h-5 w-5" />
                    Buat profil baru
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat profil baru</DialogTitle>
            <DialogDescription>
              Setiap profil memilki pengaturan dan riwayatnya sendiri
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="space-y-4 py-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama profil</Label>
                <Input id="name" name="name" autoComplete="off" />
                <p
                  className={`font-normal text-red-600 transition-opacity ${inputNameError ? 'opacity-100' : 'opacity-0'}`}
                >
                  {inputNameError || <span>&nbsp;</span>}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewProfileDialog(false)}>
              Batal
            </Button>
            <Button>Buat</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
