import { useState } from 'react'
import { Card } from '@/ui/card'
import { Input } from '@/ui/input'
import { Section } from './Section'
import { Icon } from './Icon'
import type { TRPCResponse } from '~/shared/utils/types'
import type { RouteRouter } from '~/server/trpc-procedures/route'

type Props = {
  genres: TRPCResponse<(typeof RouteRouter)['/pengaturan/filter']>['genres']
}

export function GenreSection({ genres }: Props) {
  const [keyword, setKeyword] = useState('')
  const lcKeyword = keyword.toLowerCase()

  return (
    <Section
      title="Filter genre anime"
      description="Genre anime yang ingin ditampilkan"
      className="grid gap-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4"
      afterHeader={
        <div className="ml-auto">
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Cari genre"
            className="h-full bg-[hsl(0_0_92%)] px-4 dark:bg-[hsl(0_0_14%)]"
          />
        </div>
      }
      property="hideGenre"
      getKey={item => item.id}
      items={genres.filter(genre => genre.name.toLowerCase().includes(lcKeyword))}
      renderItem={({ item: genre, isSelected, toggle }) => (
        <div
          onClick={toggle}
          className={'rounded-lg transition-colors ' + (isSelected ? 'bg-red-300/25' : 'bg-card')}
        >
          <Card className="cursor-pointer bg-transparent px-6 py-4 transition-all hover:border-primary hover:bg-accent/50">
            <div className="flex gap-3">
              <Icon checked={isSelected} />

              {genre.name}
            </div>
          </Card>
        </div>
      )}
    />
  )
}
