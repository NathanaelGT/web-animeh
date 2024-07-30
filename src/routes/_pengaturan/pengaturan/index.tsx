import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { profileStore } from '~c/stores'
import { api } from '~c/trpc'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'

export const Route = createFileRoute('/_pengaturan/pengaturan/')({
  component: Pengaturan,
})

function Pengaturan() {
  const [inputNameError, setInputNameError] = useState('')
  const update = api.profile.update.useMutation()

  const handleInputNameKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      setInputNameError('')
      return
    }

    const name = event.currentTarget.value

    if (name === '') {
      setInputNameError('Nama profil tidak boleh kosong')

      return
    }

    update.mutate(
      { ...profileStore.state, name },
      {
        onSuccess() {
          setInputNameError('')
        },
        onError(error) {
          if (error instanceof Error) {
            setInputNameError(error.message)
          }
        },
      },
    )
  }

  return (
    <div className="space-y-4 py-2 pb-4">
      <div className="grid space-y-2">
        <Label htmlFor="name">Nama profil</Label>
        <Input
          id="name"
          name="name"
          autoComplete="off"
          defaultValue={profileStore.state?.name}
          onKeyUp={handleInputNameKeyUp}
        />
        <p
          className={`font-normal text-red-600 transition-opacity ${inputNameError ? 'opacity-100' : 'opacity-0'}`}
        >
          {inputNameError || <span>&nbsp;</span>}
        </p>
      </div>
    </div>
  )
}
