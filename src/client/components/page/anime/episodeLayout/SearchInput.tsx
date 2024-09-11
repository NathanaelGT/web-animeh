import { useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { Input } from '@/ui/input'

type Props = {
  animeId: string
  search: (query: number) => void
}

export function SearchInput({ animeId, search }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return createKeybindHandler('watchPage', 'search', () => {
      inputRef.current?.focus()
    })
  }, [])

  const keyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.currentTarget.blur()
    } else if (event.key === 'Enter') {
      const number = event.currentTarget.value.trim()
      if (!number) {
        return
      }

      router.navigate({
        to: '/anime/$id/episode/$number',
        params: { id: animeId, number: number },
      })
    } else if ('Ee+-'.includes(event.key)) {
      event.preventDefault()
    }
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      onInput={e => {
        const query = Number(e.currentTarget.value)

        if (!isNaN(query)) {
          search(query)
        }
      }}
      onKeyDown={keyDownHandler}
      autoComplete="off"
      placeholder="Cari episode..."
      className="h-6 border-slate-300 bg-transparent ring-indigo-400/75 placeholder:text-slate-300/75 focus-visible:ring-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}
