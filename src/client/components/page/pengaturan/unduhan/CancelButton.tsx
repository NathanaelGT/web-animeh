import { useState } from 'react'
import { X, LoaderCircle } from 'lucide-react'
import { api } from '~c/trpc'
import { useToast } from '@/ui/use-toast'
import { Button } from '@/ui/button'

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
    <Button variant="destructive" onClick={handleClick} className="w-fit gap-1 pl-3">
      {isLoading ? <LoaderCircle className="animate-spin" /> : <X />}
      Batal
    </Button>
  )
}
