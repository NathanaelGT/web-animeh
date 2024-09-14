import { useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createKeybindHandler } from '~c/utils/eventHandler'
import { InputKeybind } from '@/ui/custom/input-keybind'

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
      event.currentTarget.blur()

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
    <InputKeybind
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
      keybindId={['watchPage', 'search']}
      wrapperClassName="h-6 border-slate-300 ring-indigo-400/75 focus-within:ring-1"
      buttonClassName="px-[.2rem]"
      tipClassName="h-4 min-w-4 border-slate-300/50 px-[.2rem] py-[.05rem] text-[.6rem]"
      className="placeholder:text-slate-300/75"
    />
  )
}
