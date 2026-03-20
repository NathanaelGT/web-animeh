import { eq } from 'drizzle-orm'
import ky from 'ky'
import { db } from '~s/db'
import { anime, characters, persons, animeToCharacters, characterToPersons } from '~s/db/schema'
import { jikanClient, jikanQueue } from '~s/external/api/jikan'
import { limitRequest } from '~s/external/limit'
import { buildConflictUpdateColumns } from '~s/utils/db'
import { imagesDirPath } from '~s/utils/path'
import { isMoreThanOneDay, isMoreThanOneMinute } from '~s/utils/time'
import { extension } from '~/shared/utils/file'

type Config = { priority?: number }

export const updateCharacter = async (
  animeData: Pick<typeof anime.$inferSelect, 'id' | 'characterUpdatedAt'>,
  config: Config = {},
) => {
  if (!isMoreThanOneMinute(animeData.characterUpdatedAt)) {
    return
  }

  // jikan ngecache data selama 24 jam
  update: if (isMoreThanOneDay(animeData.characterUpdatedAt)) {
    const promises: Promise<unknown>[] = []

    const result = await jikanQueue.add(() => jikanClient.anime.getAnimeCharacters(animeData.id), {
      throwOnTimeout: true,
      priority: config.priority ?? 1,
    })

    // @JIKAN_TYPE response dari API ada `favorites`, tapi dari docsnya engga ada
    const data = result.data as ((typeof result.data)[number] & {
      favorites: number | null // masih belum tau apakah favorites selalu number, jadi amannya dibuat nullable
    })[]

    const updateAnimeCharacterTimestamp = () => {
      return db
        .update(anime)
        .set({ characterUpdatedAt: new Date(result.header.get('Last-Modified')) })
        .where(eq(anime.id, animeData.id))
        .execute()
    }

    if (!data.length) {
      await updateAnimeCharacterTimestamp()

      break update
    }

    const characterList: (typeof characters.$inferInsert)[] = []
    const animeToCharacterList: (typeof animeToCharacters.$inferInsert)[] = []
    const personList: (typeof persons.$inferInsert)[] = []
    const characterToPersonList: (typeof characterToPersons.$inferInsert)[] = []

    for (const { character, role, favorites, voice_actors } of data) {
      let imageUrl: string | null =
        character.images.webp?.image_url || character.images.jpg.image_url

      if (imageUrl.startsWith('https://cdn.myanimelist.net/images/questionmark')) {
        imageUrl = null
      } else {
        const queryParamsSeparatorIndex = imageUrl.indexOf('?')
        if (queryParamsSeparatorIndex > -1) {
          imageUrl = imageUrl.slice(0, queryParamsSeparatorIndex)
        }

        const imagePath = `${imagesDirPath}/characters/${character.mal_id}.${extension(imageUrl)}`
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

    const mainPromises: Promise<unknown>[] = []
    if (characterList.length) {
      mainPromises.push(
        db
          .insert(characters)
          .values(characterList)
          .onConflictDoUpdate({
            target: characters.id,
            set: buildConflictUpdateColumns(characters, ['name', 'favorites', 'imageUrl']),
          })
          .execute(),
      )
    }
    if (personList.length) {
      mainPromises.push(
        db
          .insert(persons)
          .values(personList)
          .onConflictDoUpdate({
            target: persons.id,
            set: buildConflictUpdateColumns(persons, ['name']),
          })
          .execute(),
      )
    }

    await Promise.all(mainPromises)

    if (animeToCharacterList.length) {
      promises.push(
        db
          .insert(animeToCharacters)
          .values(animeToCharacterList)
          .onConflictDoUpdate({
            target: [animeToCharacters.animeId, animeToCharacters.characterId],
            set: buildConflictUpdateColumns(animeToCharacters, ['isMain']),
          })
          .execute(),
      )
    }
    if (characterToPersonList.length) {
      promises.push(
        db
          .insert(characterToPersons)
          .values(characterToPersonList)
          .onConflictDoUpdate({
            target: [characterToPersons.characterId, characterToPersons.personId],
            set: buildConflictUpdateColumns(characterToPersons, ['language']),
          })
          .execute(),
      )
    }

    promises.push(updateAnimeCharacterTimestamp())

    await Promise.all(promises)
  }
}
