import { EllipsisVertical, X, Pause, LoaderCircle } from 'lucide-react'
import { memo, useState } from 'react'
import { api } from '~c/trpc'
import { Button } from '@/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu'
import { useToast } from '@/ui/use-toast'
import type { TRPCParams } from '~/shared/utils/types'

type Props = {
  downloadName: string
}

export const DownloadDropdown = memo(function DownloadDropdown({ downloadName }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="my-auto">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <Menu downloadName={downloadName} type="cancel" icon={X} text="Batal" />
        <Menu downloadName={downloadName} type="pause" icon={Pause} text="Jeda" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

type MenuProps = Props & {
  type: TRPCParams<(typeof import('~s/trpc-procedures/download'))['DownloadRouter']['stop']>['type']
  icon: typeof X
  text: string
}

function Menu({ downloadName, type, icon: Icon, text }: MenuProps) {
  const [isLoading, setLoading] = useState(false)
  const { toast } = useToast()
  const stopDownload = api.download.stop.useMutation()

  const handleClick = () => {
    setLoading(true)

    stopDownload.mutate(
      { name: downloadName, type },
      {
        onSuccess(exists) {
          if (!exists) {
            toast({
              title: `Unduhan ${downloadName} tidak ditemukan`,
            })
          }
        },
      },
    )
  }

  return (
    <DropdownMenuItem onClick={handleClick} className="gap-1">
      {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      <span>{text}</span>
    </DropdownMenuItem>
  )
}
