import React, { useId } from 'react'
import { flushSync } from 'react-dom'
import { Filter } from 'lucide-react'
import { useStore } from '@tanstack/react-store'
import { clientProfileSettingsStore } from '~c/stores'
import { episodeDisplayMode } from '~/shared/profile/settings'
import { Button } from '@/ui/button'
import { Label } from '@/ui/label'
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'

type FilterInputProps<TValue> = {
  label: string
  defaultValue: TValue
  onValueChange: (value: TValue) => void
} & ({ options: readonly TValue[] } | { options: [TValue, string][] })

function FilterInput<TValue extends string>({
  label,
  defaultValue,
  onValueChange,
  options,
}: FilterInputProps<TValue>) {
  const id = useId()

  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={onValueChange} defaultValue={defaultValue}>
        <SelectTrigger id={id} className="col-span-2 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => {
            let value: string
            let label: string

            if (typeof option === 'string') {
              value = label = option
            } else {
              value = option[0]
              label = option[1]
            }

            return (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

type DisplayMode = (typeof episodeDisplayMode)[number]
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>

type Props = {
  episodeListRef: React.MutableRefObject<HTMLDivElement | null>
  episodeCount: number
  pageList: [number, number][]
  displayMode: DisplayMode
  setDisplayMode: StateSetter<DisplayMode>
  sortLatest: boolean
  setSortLatest: StateSetter<boolean>
  hideFiller: boolean
  setHideFiller: StateSetter<boolean>
  hideRecap: boolean
  setHideRecap: StateSetter<boolean>
  currentPage: string
  setCurrentPage: StateSetter<string>
}

export function SearchFilter({
  episodeListRef,
  episodeCount,
  pageList,
  displayMode,
  setDisplayMode,
  sortLatest,
  setSortLatest,
  hideFiller,
  setHideFiller,
  hideRecap,
  setHideRecap,
  currentPage,
  setCurrentPage,
}: Props) {
  const perPage = useStore(clientProfileSettingsStore, state => state.episodeFilter.perPage)

  const s = (value: boolean) => (value ? '1' : '0')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline2" className="h-6 w-6 bg-transparent p-1 md:mx-2">
          <Filter />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="grid gap-2">
          <FilterInput
            label="Tampilan"
            defaultValue={displayMode}
            onValueChange={setDisplayMode}
            options={episodeDisplayMode}
          />
          <FilterInput
            label="Urutan"
            defaultValue={s(sortLatest)}
            onValueChange={value => {
              setSortLatest(value === '1')

              if (value === '1') {
                setCurrentPage(episodeCount + ' - ' + Math.max(1, episodeCount - perPage + 1))
              } else {
                setCurrentPage('1 - ' + Math.min(100, episodeCount))
              }
            }}
            options={[
              ['0', 'Terlama'],
              ['1', 'Terbaru'],
            ]}
          />
          <FilterInput
            label="Filler"
            defaultValue={s(hideFiller)}
            onValueChange={value => {
              setHideFiller(value === '1')
            }}
            options={[
              ['0', 'Tampilkan'],
              ['1', 'Sembunyikan'],
            ]}
          />
          <FilterInput
            label="Recap"
            defaultValue={s(hideRecap)}
            onValueChange={value => {
              setHideRecap(value === '1')
            }}
            options={[
              ['0', 'Tampilkan'],
              ['1', 'Sembunyikan'],
            ]}
          />
          {episodeCount > perPage && (
            <FilterInput
              key={s(sortLatest)}
              label="Episode"
              defaultValue={currentPage}
              onValueChange={page => {
                setTimeout(() => {
                  flushSync(() => {
                    setCurrentPage(page)
                  })

                  episodeListRef.current?.scrollTo(0, 0)
                })
              }}
              options={pageList.map(([start, end]) => `${start} - ${end}`)}
            />
          )}
        </div>
        <PopoverArrow className="-mt-[1px] fill-popover" />
      </PopoverContent>
    </Popover>
  )
}
