import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import React, { useState, type PropsWithChildren, type ReactNode } from 'react'
import { useStoreState } from '~c/hooks/useStoreState'
import { keybindTranslation } from '~c/keybind'
import { clientProfileSettingsStore, profileStore } from '~c/stores'
import { api } from '~c/trpc'
import { formatKeybind } from '~c/utils/keybind'
import { Checkbox } from '@/ui/checkbox'
import { Label } from '@/ui/label'
import { SimpleTooltip } from '@/ui/tooltip'
import {
  miniplayerMode,
  backupStateMode,
  type videoPlayerSchema,
  type settingsSchema,
} from '~/shared/profile/settings'
import { clamp } from '~/shared/utils/number'
import { Select } from './tampilan'
import type { CheckedState } from '@radix-ui/react-checkbox'
import type { InferOutput } from 'valibot'

export const Route = createFileRoute('/_pengaturan/pengaturan/pemutar-video')({
  component: VideoPlayer,
})

function VideoPlayer() {
  const [storedMiniplayerMode, storedBackupStateMode] = useStore(
    clientProfileSettingsStore,
    ({ videoPlayer }) => {
      return [videoPlayer.miniplayerMode, videoPlayer.backupStateMode]
    },
  )

  return (
    <div className="grid gap-y-4 py-2 pb-4">
      <InputNumber
        name="volumeStep"
        label="Volume naik/turun"
        tooltip={
          <KeybindCombinationWrapper>
            <KeybindCombination id={['videoPlayer', 'volumeUp']} />
            <KeybindCombination id={['videoPlayer', 'volumeDown']} />
          </KeybindCombinationWrapper>
        }
        unit="Persen"
        multiplier={100}
        min={0.01}
        max={1}
      />

      <InputNumberExtra
        name="jumpSec"
        label="Durasi maju/mundur"
        tooltip={
          <KeybindCombinationWrapper>
            <KeybindCombination id={['videoPlayer', 'forward']} />
            <KeybindCombination id={['videoPlayer', 'back']} />
          </KeybindCombinationWrapper>
        }
        unit="Detik"
        min={0.1}
        extra={[
          {
            name: 'relativeJump',
            label: 'Relatif',
            tooltip: 'Mengatur durasi maju/mundur relatif terhadap kecepatan video',
          },
        ]}
      />

      <InputNumberExtra
        name="longJumpSec"
        label="Durasi maju/mundur jauh"
        tooltip={
          <KeybindCombinationWrapper>
            <KeybindCombination id={['videoPlayer', 'longBack']} />
            <KeybindCombination id={['videoPlayer', 'longForward']} />
          </KeybindCombinationWrapper>
        }
        unit="Detik"
        min={0.1}
        extra={[
          {
            name: 'relativeLongJump',
            label: 'Relatif',
            tooltip: 'Mengatur durasi maju/mundur relatif terhadap kecepatan video',
          },
        ]}
      />

      <InputNumberExtra
        name="padLongJumpSec"
        label="Target maju jauh diawal video"
        tooltip={
          <KeybindCombinationWrapper>
            <KeybindCombination id={['videoPlayer', 'longForward']} />
          </KeybindCombinationWrapper>
        }
        leftUnit
        unit="Detik"
        min={1}
        extra={[
          {
            name: 'padLongJumpThreshold',
            label: 'Sebelum',
            unit: 'Detik',
            min: 1,
            withRound: false,
            width: 'w-36',
          },
          {
            name: 'padLongJump',
            label: 'Aktif',
          },
        ]}
      />

      <Select
        label="Mode miniplayer"
        options={miniplayerMode}
        value={storedMiniplayerMode}
        onChange={(settings, mode) => {
          settings.videoPlayer.miniplayerMode = mode
        }}
      />

      <InputNumber
        name="miniplayerAnimationDuration"
        label="Durasi animasi miniplayer"
        unit="ms"
        min={0}
        max={10000}
      />

      <Select
        label="Simpan state pemutar video"
        options={backupStateMode}
        value={storedBackupStateMode}
        onChange={(settings, mode) => {
          settings.videoPlayer.backupStateMode = mode
        }}
      />

      <InputNumber
        name="defaultSpeed"
        label="Kecepatan default"
        unit="X"
        step={0.01}
        min={0.01}
        max={8}
      />

      <InputNumber
        name="speedStep"
        label="Kecepatan naik/turun"
        tooltip={
          <KeybindCombinationWrapper>
            <KeybindCombination id={['videoPlayer', 'decreaseSpeed']} />
            <KeybindCombination id={['videoPlayer', 'increaseSpeed']} />
          </KeybindCombinationWrapper>
        }
        unit="X"
        step={0.01}
        min={0.01}
        max={1}
      />

      <InputNumber name="smartJumpOffset" label="Offset smart jump" unit="ms" min={0} max={2500} />
    </div>
  )
}

type VideoPlayerSettings = InferOutput<typeof videoPlayerSchema>
type SettingsByType<TFilter, TObj = VideoPlayerSettings> = {
  [Key in keyof TObj]: TObj[Key] extends TFilter ? Key : never
}[keyof TObj]

const inputWrapperClassName =
  'border border-primary/15 ring-0! ring-ring ring-offset-transparent focus-within:outline-hidden focus-within:ring-2 focus-within:ring-offset-2 focus-within:rounded-md'

type InputNumberPrimitiveProps = {
  name: SettingsByType<number>
  label: string
  leftUnit?: boolean
  unit: string
  step?: number
  min?: number
  max?: number
  withRound?: boolean
  width?: `w-${number}`
  value: number | undefined
  setValue: (value: number | undefined) => void
  setInputError: (error: string) => void
  children?: (className: string, setInputError: (error: string) => void) => ReactNode
}

function InputNumberPrimitive({
  name,
  label,
  leftUnit = false,
  unit,
  step = 1,
  min,
  max,
  withRound = true,
  width = 'w-60',
  value,
  setValue,
  setInputError,
  children,
}: InputNumberPrimitiveProps) {
  const update = api.profile.update.useMutation()

  const onInput = (event: React.FormEvent<HTMLInputElement>) => {
    const value = event.currentTarget.valueAsNumber

    setValue(isNaN(value) ? undefined : clamp(value, min, max))

    if (min !== undefined && value < min) {
      setInputError(`${label} minimal ${min} ${unit.toLowerCase()}`)
    } else if (max !== undefined && value > max) {
      setInputError(`${label} maksimal ${max} ${unit.toLowerCase()}`)
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
        setInputError(error.message)
      },
    })
  }

  const labelEl = (
    <label
      htmlFor={name}
      className={
        'flex items-center border-primary/15 bg-primary/10 px-3 ' +
        (withRound
          ? leftUnit
            ? (children ? 'rounded-l-md' : '') + ' border-r'
            : (children ? '' : 'rounded-r-md') + ' border-l'
          : '')
      }
    >
      {unit}
    </label>
  )

  return (
    <div
      className={`flex h-10 ${width} ${withRound ? (children ? 'rounded-l-md border-r-0' : 'rounded-md') : 'border-r-0'} ${inputWrapperClassName}`}
    >
      {leftUnit ? labelEl : null}

      <input
        id={name}
        type="number"
        step={step}
        value={value ?? ''}
        onKeyDown={onKeyDown}
        onInput={onInput}
        className="w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-hidden"
      />

      {leftUnit ? null : labelEl}
    </div>
  )
}

type InputNumberProps = Omit<InputNumberPrimitiveProps, 'value' | 'setValue' | 'setInputError'> & {
  name: SettingsByType<number>
  label: string
  tooltip?: ReactNode
  nextLabels?: ReturnType<typeof Label>[]
  leftUnit?: boolean
  unit: string
  multiplier?: number
  step?: number
  min?: number
  max?: number
  children?: (className: string, setInputError: (error: string) => void) => ReactNode
}

function InputNumber({
  name,
  label,
  tooltip,
  nextLabels,
  leftUnit = false,
  unit,
  multiplier = 1,
  step = 1,
  min,
  max,
  children,
}: InputNumberProps) {
  const [inputError, setInputError] = useState('')
  const [value, setValue] = useStoreState(clientProfileSettingsStore, state => {
    const value = state.videoPlayer[name] * multiplier

    return isNaN(value) ? undefined : value
  })

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

  return (
    <div className="flex flex-col gap-y-2">
      <div
        className="grid gap-y-2"
        style={
          nextLabels
            ? { gridTemplateColumns: ' min-content'.repeat(nextLabels.length + 1) }
            : undefined
        }
      >
        {tooltip ? <SimpleTooltip title={tooltip}>{labelElement}</SimpleTooltip> : labelElement}

        {nextLabels}

        <InputNumberPrimitive
          name={name}
          label={label}
          leftUnit={leftUnit}
          unit={unit}
          step={step}
          min={min}
          max={max}
          value={value}
          setValue={setValue}
          setInputError={setInputError}
          children={children}
        />

        {children?.(inputWrapperClassName + ' rounded-r-md', setInputError)}
      </div>

      <div className={`mb-auto text-red-600 transition-[height] ${inputError ? 'h-6!' : 'h-0!'}`}>
        {inputError}
      </div>
    </div>
  )
}

type InputNumberExtraBoolean = {
  name: SettingsByType<boolean>
  label: string
  tooltip?: ReactNode
  leftUnit?: never
  unit?: never
  multiplier?: never
  step?: never
  min?: never
  max?: never
  withRound?: never
  width?: never
}

type InputNumberExtraNumber<TExcept extends SettingsByType<number>> = {
  name: Exclude<SettingsByType<number>, TExcept>
  label: string
  tooltip?: ReactNode
  leftUnit?: boolean
  unit: string
  multiplier?: number
  step?: number
  min?: number
  max?: number
  withRound?: boolean
  width?: `w-${number}`
}

type InputNumberExtraProps<TName extends SettingsByType<number>> = Omit<
  InputNumberProps,
  'name' | 'children' | 'nextLabel'
> & {
  name: TName
  extra: (InputNumberExtraBoolean | InputNumberExtraNumber<TName>)[]
}

function InputNumberExtra<TName extends SettingsByType<number>>(
  props: InputNumberExtraProps<TName>,
) {
  const update = api.profile.update.useMutation()
  const [values, setValues] = useStoreState(clientProfileSettingsStore, state =>
    props.extra.map(({ name }) => state.videoPlayer[name]),
  )

  const onCheckedChange = (index: number) => (value: CheckedState) => {
    const profile = structuredClone(profileStore.state!)

    // @ts-expect-error HELP ts god
    profile.settings.videoPlayer[props.extra[index]!.name] = !!value

    setValues(list => {
      const newList = list.slice()
      // @ts-expect-error HELP ts god
      newList[index] = value

      return newList
    })

    update.mutate(profile)
  }

  const onValueChange = (index: number) => (value: number | undefined) => {
    setValues(list => {
      const newList = list.slice()
      // @ts-expect-error HELP ts god
      newList[index] = value

      return newList
    })
  }

  return (
    <InputNumber
      {...props}
      nextLabels={props.extra.map((extra, index) => {
        const label = extra.unit ? (
          <Label
            htmlFor={extra.name}
            className={
              'w-fit transition-transform' +
              (values[index] ===
              clientProfileSettingsStore.state.videoPlayer[extra.name] * (extra.multiplier || 1)
                ? ''
                : 'translate-x-[.1rem] -skew-x-18')
            }
          >
            {extra.label}
          </Label>
        ) : (
          <Label htmlFor={extra.name}>{extra.label}</Label>
        )

        if (!extra.tooltip) {
          return label
        }

        return <SimpleTooltip title={extra.tooltip}>{label}</SimpleTooltip>
      })}
      children={(className, setInputError) => {
        return props.extra.map((extra, index) => {
          const value = values[index]!

          if (typeof value === 'boolean') {
            return (
              <div className={className + ' h-10 w-10 p-2'}>
                <div className="relative h-full w-full">
                  <Checkbox
                    id={extra.name}
                    checked={value}
                    onCheckedChange={onCheckedChange(index)}
                    className="absolute inset-0 h-full w-full transition-colors"
                  />
                </div>
              </div>
            )
          }

          return (
            <InputNumberPrimitive
              name={extra.name as any}
              label={extra.label}
              leftUnit={extra.leftUnit}
              unit={extra.unit!}
              step={extra.step}
              min={extra.min}
              max={extra.max}
              withRound={extra.withRound}
              width={extra.width}
              value={value}
              setValue={onValueChange(index)}
              setInputError={setInputError}
            />
          )
        })
      }}
    ></InputNumber>
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
