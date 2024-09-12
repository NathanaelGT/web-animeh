import { useState } from 'react'
import { api } from '~c/trpc'
import { profileStore } from '~c/stores'
import { keybindTranslation } from '~c/keybind'
import { keybindModifiers, captureKeybindFromEvent, formatKeybind } from '~c/utils/keybind'
import { Label } from '@/ui/label'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/ui/dialog'

type Props = {
  group: string
  keybindKey: string
  name: string
  combination: string[]
}

export function EditKeybind({ group, keybindKey, name, combination: _combination }: Props) {
  const [combination, setCombination] = useState<string[]>(_combination)
  const [inputError, setInputError] = useState('')
  const updateProfile = api.profile.update.useMutation()

  const combinationsEqual = (combination1: string[], combination2: string[]) => {
    for (let i = 0; i < combination1.length; i++) {
      if (combination1[i] !== combination2[i]) {
        return false
      }
    }
    return true
  }

  const keydownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      return
    } else if (event.key === 'Backspace') {
      setCombination([])
      setInputError('')

      return
    }

    event.preventDefault()

    const combination = captureKeybindFromEvent(event)

    const profileKeybinds = profileStore.state!.settings.keybind

    const findConflict = () => {
      if (combination.length === 0) {
        return ''
      }

      for (const groupName in profileKeybinds) {
        const groupKeybinds = profileKeybinds[groupName as keyof typeof profileKeybinds] as Record<
          string,
          string[]
        >

        for (const currentKeybindKey in groupKeybinds) {
          if (
            currentKeybindKey !== keybindKey &&
            combinationsEqual(groupKeybinds[currentKeybindKey]!, combination)
          ) {
            return (
              (combination.length > 1 ? 'Kombinasi k' : 'K') +
              'eybind ini sudah digunakan pada ' +
              // @ts-expect-error
              keybindTranslation[groupName][currentKeybindKey][0].toLowerCase() +
              '.'
            )
          }
        }
      }

      return ''
    }

    setInputError(findConflict())
    setCombination(combination)
  }

  const save = () => {
    if (combinationsEqual(combination, _combination)) {
      return
    }

    if (combination.at(-1) === 'Space') {
      combination[combination.length - 1] = ' '
    }

    const profile = structuredClone(profileStore.state!)
    // @ts-expect-error
    profile.settings.keybind[group][keybindKey] = combination

    updateProfile.mutate(profile)
  }

  const combinationToShow = combination.map(item => item) // shallow copy
  const combinationLastItem = combinationToShow.at(-1)
  if (combinationLastItem?.length === 1) {
    combinationToShow[combinationToShow.length - 1] = formatKeybind(combinationLastItem)
  }

  return (
    <DialogContent className="sm:max-w-[60ch]">
      <DialogHeader>
        <DialogTitle>Ubah Keybind "{name}"</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        <Label>Masukkan kombinasi keybind</Label>
        <Input
          onKeyDown={keydownHandler}
          value={combinationToShow.join(' + ')}
          autoFocus
          readOnly
          className="select-none"
        />
        <p
          className={`font-normal text-red-600 transition-opacity ${inputError ? 'opacity-100' : 'opacity-0'}`}
        >
          {inputError || <span>&nbsp;</span>}
        </p>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button
            type="submit"
            disabled={inputError !== '' || combination.length === 0}
            onClick={save}
          >
            Simpan
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}
