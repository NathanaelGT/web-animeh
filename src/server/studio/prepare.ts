import type { studios, studioSynonyms } from '~s/db/schema'
import type { Producer } from '~s/external/api/jikan'

export const prepareStudioData = (data: Producer) => {
  const synonyms = data.titles.slice(1)

  const imageUrl = data.images.jpg.image_url

  const studio = {
    id: data.mal_id,
    name: data.titles[0]!.title,
    imageUrl: [
      'https://cdn.myanimelist.net/images/company_no_picture.png',
      'https://cdn.myanimelist.net/images/company/placeholder.png',
    ].includes(imageUrl)
      ? null
      : imageUrl,
    establishedAt: data.established ? new Date(data.established) : null,
    about: data.about,
  } satisfies typeof studios.$inferInsert

  const synonymList = synonyms.map(({ title, type }) => {
    return {
      studioId: data.mal_id,
      synonym: title,
      type,
    } satisfies typeof studioSynonyms.$inferInsert
  })

  return [studio, synonymList] as const
}
