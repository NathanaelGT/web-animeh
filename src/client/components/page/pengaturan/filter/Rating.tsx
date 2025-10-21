import { Card } from '@/ui/card'
import { AnimeRating } from '@/Anime/Rating'
import { Section } from './Section'
import { Icon } from './Icon'
import { ratings } from '~/shared/anime/rating'

export function RatingSection() {
  return (
    <Section
      title="Filter rating anime"
      description="Rating anime yang ingin ditampilkan"
      className="flex flex-wrap gap-3"
      property="hideRating"
      getKey={item => item}
      items={Object.keys(ratings)}
      renderItem={({ item: rating, isSelected, toggle }) => (
        <AnimeRating
          rating={rating}
          className={
            'rounded-lg p-0 transition-colors' +
            (isSelected ? ' bg-opacity-25 dark:bg-opacity-50' : '')
          }
        >
          <Card
            onClick={toggle}
            className="cursor-pointer bg-transparent px-6 py-4 transition-all hover:border-primary hover:bg-white/50"
          >
            <div className="flex gap-3 text-black">
              <Icon checked={isSelected} />

              {rating}
            </div>
          </Card>
        </AnimeRating>
      )}
    />
  )
}
