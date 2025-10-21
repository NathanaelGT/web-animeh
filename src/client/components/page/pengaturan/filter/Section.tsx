import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { useStoreState } from '~c/hooks/useStoreState'
import { clientProfileSettingsStore, profileStore } from '~c/stores'
import { api } from '~c/trpc'
import type { ReactNode, JSX } from 'react'

type Filters = NonNullable<typeof profileStore.state>['settings']['animeFilter']

export function Section<
  TProperty extends keyof Filters,
  TItems extends unknown[],
  TKey extends Filters[TProperty][number],
>({
  title,
  description,
  className,
  afterHeader,
  property,
  items,
  getKey,
  renderItem: Render,
}: {
  title: string
  description: string
  className?: string
  afterHeader?: ReactNode
  property: TProperty
  items: TItems
  getKey: (item: TItems[number]) => TKey
  renderItem: (props: {
    item: TItems[number]
    isSelected: boolean
    toggle: () => void
  }) => JSX.Element
}) {
  const update = api.profile.update.useMutation()

  const [hidden, setHidden] = useStoreState(
    clientProfileSettingsStore,
    state => new Set(state.animeFilter[property] as unknown[]) as Set<Filters[TProperty][number]>,
  )

  return (
    <Card className="relative">
      <div
        data-subs-header="top-16"
        className="sticky top-0 z-10 flex gap-6 rounded-t-lg border-b bg-[hsl(0_0_96%)] px-6 py-4 transition-[top] dark:bg-[hsl(0_0_10%)]"
      >
        <CardHeader className="p-0">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {afterHeader}
      </div>
      <CardContent className={'pt-6 ' + (className || '')}>
        {items.map((item: TItems[number]) => {
          const key = getKey(item)
          const isSelected = hidden.has(key)
          const toggle = () => {
            const profile = structuredClone(profileStore.state!)

            const list = profile.settings.animeFilter[property] as TItems
            const index = list.indexOf(key)

            if (index === -1) {
              list.push(key)
            } else {
              list.splice(index, 1)
            }

            const sortMethod = typeof key === 'number' ? (a: number, b: number) => a - b : undefined
            list.sort(sortMethod as (a: unknown, b: unknown) => number)

            setHidden(new Set(list as any[]))

            update.mutate(profile)
          }

          return <Render key={key} item={item} isSelected={isSelected} toggle={toggle} />
        })}
      </CardContent>
    </Card>
  )
}
