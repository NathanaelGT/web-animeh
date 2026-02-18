import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import React, { useState, type PropsWithChildren, type ReactNode } from 'react'
import TextTransition, { presets } from 'react-text-transition'
import { useStoreState } from '~c/hooks/useStoreState'
import { keybindTranslation } from '~c/keybind'
import { clientProfileSettingsStore, profileStore } from '~c/stores'
import { api } from '~c/trpc'
import { cn } from '~c/utils'
import { formatKeybind } from '~c/utils/keybind'
import { Card } from '@/ui/card'
import { Checkbox } from '@/ui/checkbox'
import { Label } from '@/ui/label'
import { SimpleTooltip } from '@/ui/tooltip'
import { clamp } from '~/shared/utils/number'
import { ucFirst } from '~/shared/utils/string'
import type { InferOutput } from 'valibot'
import type { videoPlayerSchema, settingsSchema } from '~/shared/profile/settings'

export const Route = createFileRoute('/_pengaturan/pengaturan/pemutar-video')({
  component: VideoPlayer,
})

function VideoPlayer() {
  return (
    <Card className="bg-border/50 p-6">
      <Group>
        <InputNumberSwitch
          name="jumpSec"
          label="Durasi maju/mundur"
          tooltip={
            <KeybindCombinationWrapper>
              <KeybindCombination id={['videoPlayer', 'forward']} />
              <KeybindCombination id={['videoPlayer', 'back']} />
            </KeybindCombinationWrapper>
          }
          switchName="relativeJump"
          switchLabel="Relatif"
          switchTooltip="Mengatur durasi maju/mundur relatif terhadap kecepatan video"
          unit="detik"
          min={0.1}
        />

        <InputNumberSwitch
          name="longJumpSec"
          label="Durasi maju/mundur jauh"
          tooltip={
            <KeybindCombinationWrapper>
              <KeybindCombination id={['videoPlayer', 'longForward']} />
              <KeybindCombination id={['videoPlayer', 'longBack']} />
            </KeybindCombinationWrapper>
          }
          switchName="relativeLongJump"
          switchLabel="Relatif"
          switchTooltip="Mengatur durasi maju/mundur relatif terhadap kecepatan video"
          unit="detik"
          min={0.1}
        />

        <InputNumber
          name="volumeStep"
          label="Volume naik/turun"
          tooltip={
            <KeybindCombinationWrapper>
              <KeybindCombination id={['videoPlayer', 'volumeUp']} />
              <KeybindCombination id={['videoPlayer', 'volumeDown']} />
            </KeybindCombinationWrapper>
          }
          unit="persen"
          multiplier={100}
          min={0.01}
          max={1}
        />
      </Group>
    </Card>
  )
}

function Group({ children }: PropsWithChildren) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-8 gap-y-4">
      {children}
    </div>
  )
}

type VideoPlayerSettings = InferOutput<typeof videoPlayerSchema>
type SettingsByType<TFilter, TObj = VideoPlayerSettings> = {
  [Key in keyof TObj]: TObj[Key] extends TFilter ? Key : never
}[keyof TObj]

type InputNumberProps = PropsWithChildren<{
  name: SettingsByType<number>
  label: string
  tooltip?: ReactNode
  nextLabel?: ReturnType<typeof Label>
  unit: string
  multiplier?: number
  min?: number
  max?: number
  childrenClassName?: string
}>

function InputNumber({
  name,
  label,
  tooltip,
  nextLabel,
  unit,
  multiplier = 1,
  min,
  max,
  children,
  childrenClassName,
}: InputNumberProps) {
  const [inputError, setInputError] = useState('')
  const [value, setValue] = useStoreState(clientProfileSettingsStore, state => {
    const value = state.videoPlayer[name] * multiplier

    return isNaN(value) ? undefined : value
  })
  const update = api.profile.update.useMutation()

  const onInput = (event: React.FormEvent<HTMLInputElement>) => {
    const value = event.currentTarget.valueAsNumber

    setValue(isNaN(value) ? undefined : clamp(value, min, max))

    if (min !== undefined && value < min) {
      setInputError(`${label} minimal ${min} ${unit}`)
    } else if (max !== undefined && value > max) {
      setInputError(`${label} maksimal ${max} ${unit}`)
    } else {
      setInputError('')
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ('Ee+-'.includes(event.key)) {
      event.preventDefault()

      return
    } else if (value === undefined || event.key !== 'Enter') {
      return
    }

    const profile = structuredClone(profileStore.state!)
    profile.settings.videoPlayer[name] = value

    update.mutate(profile, {
      onSuccess() {
        setInputError('')
      },
      onError(error) {
        if (error instanceof Error) {
          setInputError(error.message)
        }
      },
    })
  }

  const labelElement = (
    <Label
      htmlFor={name}
      className={
        'w-fit transition-transform' +
        (value === clientProfileSettingsStore.state.videoPlayer[name] * multiplier
          ? ''
          : 'translate-x-[.1rem] -skew-x-18')
      }
    >
      {label}
    </Label>
  )

  const inputWrapperClassName =
    'border border-primary/15 bg-primary/10 ring-0! ring-ring ring-offset-transparent focus-within:outline-hidden focus-within:ring-2 focus-within:ring-offset-2 focus-within:rounded-md'

  return (
    <div className="flex max-w-80 flex-col gap-y-2">
      <div className={`grid gap-y-2 ${children ? 'grid-cols-[1fr_min-content]' : ''}`}>
        {tooltip ? <SimpleTooltip title={tooltip}>{labelElement}</SimpleTooltip> : labelElement}

        {nextLabel}

        <div
          className={`flex h-10 ${children ? 'rounded-l-md' : 'rounded-md'} ${inputWrapperClassName}`}
        >
          <input
            id={name}
            type="number"
            value={value ?? ''}
            onKeyDown={onKeyDown}
            onInput={onInput}
            className="w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-hidden"
          />
          <label
            htmlFor={name}
            className="flex items-center border-l border-primary/15 bg-primary/10 px-3"
          >
            {ucFirst(unit)}
          </label>
        </div>

        {children && (
          <div className={cn(inputWrapperClassName + ' rounded-r-md', childrenClassName)}>
            {children}
          </div>
        )}
      </div>

      <TextTransition
        springConfig={presets.gentle}
        direction="up"
        className={`mb-auto text-red-600 transition-[height] ${inputError ? 'h-6!' : 'h-0!'}`}
      >
        {inputError}
      </TextTransition>
    </div>
  )
}

type InputNumberSwitchProps = Omit<InputNumberProps, 'children' | 'nextLabel'> & {
  switchName: SettingsByType<boolean>
  switchLabel: string
  switchTooltip: ReactNode
}

function InputNumberSwitch(props: InputNumberSwitchProps) {
  const update = api.profile.update.useMutation()
  const [checked, setChecked] = useStoreState(
    clientProfileSettingsStore,
    state => state.videoPlayer[props.switchName],
  )

  const onCheckedChange = (checked: boolean) => {
    const profile = structuredClone(profileStore.state!)

    profile.settings.videoPlayer[props.switchName] = checked

    setChecked(checked)

    update.mutate(profile)
  }

  return (
    <InputNumber
      {...props}
      nextLabel={
        <SimpleTooltip title={props.switchTooltip}>
          <Label htmlFor={props.switchName}>{props.switchLabel}</Label>
        </SimpleTooltip>
      }
      childrenClassName="h-10 w-10 p-2"
    >
      <div className="relative h-full w-full">
        <Checkbox
          id={props.switchName}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="absolute inset-0 h-full w-full transition-colors"
        />
      </div>
    </InputNumber>
  )
}

function KeybindCombinationWrapper({ children }: PropsWithChildren) {
  return <div className="grid grid-cols-[auto_auto] items-center gap-2">{children}</div>
}

type KeybindGroups = InferOutput<typeof settingsSchema>['keybind']
function KeybindCombination<TGroup extends keyof KeybindGroups>({
  id,
}: {
  id: [TGroup, keyof KeybindGroups[TGroup]]
}) {
  const combination = useStore(clientProfileSettingsStore, state => {
    const combination = state.keybind[id[0]][id[1]] as string[]
    const combinationLastItem = combination.at(-1)
    if (combinationLastItem?.length === 1) {
      combination[combination.length - 1] = formatKeybind(combinationLastItem)
    }

    return combination
  })

  return (
    <>
      <div className="ml-auto w-fit text-center">
        {(keybindTranslation[id[0]][id[1]] as string[]).map((text, index) => {
          return index ? (
            <p key={index} className="text-muted-foreground">
              {text.toLowerCase()}
            </p>
          ) : (
            <p key={index}>Keybind {text.toLowerCase()}:</p>
          )
        })}
      </div>

      <div className="flex items-center gap-2 select-none">
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
    </>
  )
}
