import { eq } from 'drizzle-orm'
import ky from 'ky'
import { db } from '~s/db'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { anime, characters, persons, animeToCharacters, characterToPersons } from '~s/db/schema'
import { jikanClient, jikanQueue } from '~s/external/api/jikan'
import { isMoreThanOneDay, isMoreThanOneMinute } from '~s/utils/time'
import { basePath } from '~s/utils/path'
import { limitRequest } from '~s/external/limit'
import { extension } from '~/shared/utils/file'

export const updateCharacter = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'characterUpdatedAt'>,
) => {
  if (!isMoreThanOneMinute(animeData.characterUpdatedAt)) {
    return
  }

  // jikan ngecache data selama 24 jam
  update: if (isMoreThanOneDay(animeData.characterUpdatedAt)) {
    const promises: Promise<unknown>[] = []

    const result = await jikanQueue.add(() => jikanClient.anime.getAnimeCharacters(animeData.id), {
      throwOnTimeout: true,
      priority: 1,
    })

    // @JIKAN_TYPE response dari API ada `favorites`, tapi dari docsnya engga ada
    const data = result.data as ((typeof result.data)[number] & {
      favorites: number | null // masih belum tau apakah favorites selalu number, jadi amannya dibuat nullable
    })[]

    if (!data.length) {
      break update
    }

    const characterList: (typeof characters.$inferInsert)[] = []
    const animeToCharacterList: (typeof animeToCharacters.$inferInsert)[] = []
    const personList: (typeof persons.$inferInsert)[] = []
    const characterToPersonList: (typeof characterToPersons.$inferInsert)[] = []

    for (const { character, role, favorites, voice_actors } of data) {
      let imageUrl: string | null =
        character.images.webp?.image_url || character.images.jpg.image_url
      let imageExtension: string | null

      if (imageUrl.startsWith('https://cdn.myanimelist.net/images/questionmark')) {
        imageUrl = null
        imageExtension = null
      } else {
        const queryParamsSeparatorIndex = imageUrl.indexOf('?')
        if (queryParamsSeparatorIndex > -1) {
          imageUrl = imageUrl.slice(0, queryParamsSeparatorIndex)
        }

        imageExtension = extension(imageUrl)

        const imagePath = `${basePath}images/characters/${character.mal_id}.${imageExtension}`
        promises.push(
          Bun.file(imagePath)
            .exists()
            .then(async exists => {
              if (!exists) {
                const request = limitRequest(() => ky.get(imageUrl!))

                await Bun.write(imagePath, await request)
              }
            }),
        )
      }

      characterList.push({
        id: character.mal_id,
        name: character.name,
        favorites,
        imageUrl,
        imageExtension,
      })

      animeToCharacterList.push({
        animeId: animeData.id,
        characterId: character.mal_id,
        isMain: role === 'Main',
      })

      for (const voiceActor of voice_actors) {
        personList.push({
          id: voiceActor.person.mal_id,
          name: voiceActor.person.name,
        })

        characterToPersonList.push({
          characterId: character.mal_id,
          personId: voiceActor.person.mal_id,
          language: voiceActor.language,
        })
      }
    }

    await Promise.all([
      db
        .insert(characters)
        .values(characterList)
        .onConflictDoUpdate({
          target: characters.id,
          set: buildConflictUpdateColumns(characters, [
            'name',
            'favorites',
            'imageUrl',
            'imageExtension',
          ]),
        })
        .execute(),

      db
        .insert(persons)
        .values(personList)
        .onConflictDoUpdate({
          target: persons.id,
          set: buildConflictUpdateColumns(persons, ['name']),
        })
        .execute(),
    ])

    promises.push(
      db
        .insert(animeToCharacters)
        .values(animeToCharacterList)
        .onConflictDoUpdate({
          target: [animeToCharacters.animeId, animeToCharacters.characterId],
          set: buildConflictUpdateColumns(animeToCharacters, ['isMain']),
        })
        .execute(),

      db
        .insert(characterToPersons)
        .values(characterToPersonList)
        .onConflictDoUpdate({
          target: [characterToPersons.characterId, characterToPersons.personId],
          set: buildConflictUpdateColumns(characterToPersons, ['language']),
        })
        .execute(),

      db
        .update(anime)
        .set({ characterUpdatedAt: new Date(result.header.get('Last-Modified')) })
        .where(eq(anime.id, animeData.id))
        .execute(),
    )

    await Promise.all(promises)
  }
}
