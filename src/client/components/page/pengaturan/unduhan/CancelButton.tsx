import { useState } from 'react'
import { EllipsisVertical, X, LoaderCircle } from 'lucide-react'
import { api } from '~c/trpc'
import { useToast } from '@/ui/use-toast'
import { Button } from '@/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu'

type Props = {
  name: string
}

export function CancelButton({ name }: Props) {
  const [isLoading, setLoading] = useState(false)
  const { toast } = useToast()
  const cancelDownload = api.download.cancel.useMutation()

  const handleClick = () => {
    setLoading(true)

    cancelDownload.mutate(name, {
      onSuccess(exists) {
        if (!exists) {
          toast({
            title: `Unduhan ${name} tidak ditemukan`,
          })
        }
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="my-auto">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuItem onClick={handleClick} className="gap-1">
          {isLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <X className="h-5 w-5" />
          )}
          <span>Batal</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
