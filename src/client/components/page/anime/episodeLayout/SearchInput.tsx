import { useRouter } from '@tanstack/react-router'
import { Input } from '@/ui/input'

type Props = {
  animeId: string
  search: (query: number) => void
}

export function SearchInput({ animeId, search }: Props) {
  const router = useRouter()

  const keyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const number = event.currentTarget.value.trim()
      if (!number) {
        return
      }

      router.navigate({
        to: '/anime/$id/episode/$number',
        params: { id: animeId, number: number },
      })
    }
  }

  return (
    <Input
      onInput={e => {
        const query = Number(e.currentTarget.value)

        if (!isNaN(query)) {
          search(query)
        }
      }}
      onKeyDown={keyDownHandler}
      autoComplete="off"
      placeholder="Cari episode..."
      className="h-6 border-slate-300 bg-transparent ring-indigo-400/75 placeholder:text-slate-300/75 focus-visible:ring-1"
    />
  )
}
