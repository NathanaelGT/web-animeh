import { useState } from 'react'
import { api } from '~c/trpc'
import { profileStore } from '~c/stores'
import { keybindGroupConflicts, keybindTranslation } from '~c/keybind'
import { createKeybindMatcher, keybindCombinationsMatch, formatKeybind } from '~c/utils/keybind'
import { Label } from '@/ui/label'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/ui/dialog'

type Props = {
  group: string
  keybindKey: string
  name: string
  combination: string[]
  close: () => void
}

export function EditKeybind({ group, keybindKey, name, combination: _combination, close }: Props) {
  const [combination, setCombination] = useState<string[]>(_combination)
  const [inputError, setInputError] = useState('')
  const updateProfile = api.profile.update.useMutation()

  const keydownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      return
    } else if (event.key === 'Backspace') {
      setCombination([])
      setInputError('')

      return
    }

    if (combination.length) {
      if (event.key === 'Enter') {
        event.stopPropagation()

        save()
        close()

        return
      } else if (event.key === 'Tab') {
        return
      }
    }

    event.preventDefault()

    const keybindMatch = createKeybindMatcher(event)

    const profileKeybinds = profileStore.state!.settings.keybind

    const findConflict = () => {
      if (keybindMatch.capturedCombination.length === 0) {
        return ''
      }

      type Groups = keyof typeof profileKeybinds
      const keybindGroupsToCheck = new Set<Groups>()

      for (const groups of keybindGroupConflicts) {
        if (groups.includes(group as Groups)) {
          for (const group of groups) {
            keybindGroupsToCheck.add(group)
          }
        }
      }

      for (const groupName of keybindGroupsToCheck) {
        const groupKeybinds = profileKeybinds[groupName] as Record<string, string[]>

        for (const currentKeybindKey in groupKeybinds) {
          if (currentKeybindKey !== keybindKey && keybindMatch(groupKeybinds[currentKeybindKey]!)) {
            return (
              (keybindMatch.capturedCombination.length > 1 ? 'Kombinasi k' : 'K') +
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
    setCombination(keybindMatch.capturedCombination)
  }

  const save = () => {
    if (keybindCombinationsMatch(combination, _combination)) {
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

  const combinationToShow = combination.slice() // shallow copy
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
          placeholder="Tanpa keybind"
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
          <Button type="submit" disabled={inputError !== ''} onClick={save}>
            Simpan
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}
