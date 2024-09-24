import React, { useState } from 'react'
import { formatKeybind } from '~c/utils/keybind'
import { EditKeybind } from './EditKeybind'
import { Dialog, DialogTrigger } from '@/ui/dialog'
import { SimpleTooltip } from '@/ui/tooltip'

type Props = Omit<Parameters<typeof EditKeybind>[0], 'close'> & {
  note: string | undefined
}

export function KeybindSetting(props: Props) {
  const { group, keybindKey, name, note, combination } = props
  const [isOpen, setOpen] = useState(false)
  const [dialogStateResetter, setDialogStateResetter] = useState(true)

  const handleFocusElementKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.stopPropagation()
      setOpen(true)
    } else if (event.key === 'Escape') {
      event.currentTarget.blur()
    }
  }

  return (
    <div className="px-6 py-3 first:pt-5 last:pb-5 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.02]">
      <div
        tabIndex={0}
        onKeyDown={handleFocusElementKeydown}
        id={`keybind_${group}_${keybindKey}`}
        className="md grid grid-cols-2 gap-6 outline-offset-8"
      >
        <div className="my-auto">
          <p className="text-pretty">{name}</p>
          {note && <p className="text-pretty text-sm text-primary/40">{note}.</p>}
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={isOpen => {
            // tiap kali dialognya ketutup, reset state dialognya
            if (!isOpen) {
              setDialogStateResetter(state => !state)
            }

            setOpen(isOpen)
          }}
        >
          <div className="my-auto">
            <SimpleTooltip
              title={combination.map((key, index) => {
                if (index < combination.length - 1) {
                  return (
                    <React.Fragment key={index}>
                      {key}
                      <span className="text-primary/40"> + </span>
                    </React.Fragment>
                  )
                }

                // untuk key yang bukan char (misalnya ArrowLeft), jangan diubah
                return key.length === 1 ? formatKeybind(key) : key
              })}
            >
              <DialogTrigger asChild>
                <div className="flex w-fit cursor-pointer select-none items-center gap-2 rounded-md bg-primary/5 p-2">
                  {combination.length ? (
                    combination.map((key, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <span>+</span>}
                        <div className="w-fit rounded-sm border border-primary/50 px-3 py-1">
                          {formatKeybind(key)}
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="border border-transparent px-3 py-1 text-muted-foreground">
                      Tidak ada
                    </span>
                  )}
                </div>
              </DialogTrigger>
            </SimpleTooltip>
          </div>

          <EditKeybind
            key={dialogStateResetter + combination.join('__')}
            close={() => {
              setOpen(false)
            }}
            {...props}
          />
        </Dialog>
      </div>
    </div>
  )
}
