import * as React from 'react'
import { cn } from '~c/utils'
import { KeybindTip } from './keybind-tip'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']

export interface InputKeybindProps<TGroup extends keyof KeybindGroups>
  extends React.InputHTMLAttributes<HTMLInputElement> {
  keybindId: [TGroup, keyof KeybindGroups[TGroup]]
  wrapperRef?:
    | React.MutableRefObject<HTMLDivElement | null>
    | ((ref: HTMLDivElement | null) => void)
  wrapperClassName?: string
  buttonClassName?: string
  tipClassName?: string
}

// @ts-expect-error
export const InputKeybind = React.forwardRef<HTMLInputElement, any>(function InputKeybind(
  {
    keybindId,
    className,
    wrapperRef,
    wrapperClassName,
    buttonClassName,
    tipClassName,
    ...props
  }: InputKeybindProps<keyof KeybindGroups>,
  forwardedRef,
) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useImperativeHandle(forwardedRef, () => ref.current!)

  return (
    <div
      ref={ref => {
        if (wrapperRef) {
          if (typeof wrapperRef === 'function') {
            wrapperRef(ref)
          } else {
            wrapperRef.current = ref
          }
        }
      }}
      className={cn(
        'flex h-10 rounded-md border border-input ring-0! ring-ring ring-offset-transparent focus-within:outline-hidden focus-within:ring-2 focus-within:ring-offset-2',
        wrapperClassName,
      )}
    >
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full bg-transparent py-2 pl-3 text-sm placeholder:text-muted-foreground focus:outline-hidden',
          className,
        )}
      />

      <button
        onClick={() => {
          ref.current?.focus()
        }}
        tabIndex={-1}
        className={cn('cursor-text px-2', buttonClassName)}
      >
        <KeybindTip id={keybindId} className={tipClassName} />
      </button>
    </div>
  )
}) as <TGroup extends keyof KeybindGroups>(
  props: InputKeybindProps<TGroup> & {
    ref: React.MutableRefObject<HTMLInputElement | null> | ((ref: HTMLInputElement | null) => void)
  },
) => JSX.Element
