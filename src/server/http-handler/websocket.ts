import Bun from 'bun'
import { db } from '~s/db'
import { profiles } from '~s/db/schema'
import { defaultSettings, parse } from '~/shared/profile/settings'
import { isProduction } from '~s/env' with { type: 'macro' }
import type { WebSocketData } from '~s/index'

const globalForId = globalThis as unknown as {
  id: number
}
if (!isProduction()) {
  globalForId.id ??= 1
}

let id = 1

export const handleWebsocketRequest = async (request: Request, server: Bun.Server) => {
  const [version, profileIdString] = request.url.slice(server.url.origin.length + 1).split('&')
  const profileId = Number(profileIdString)

  let profile = await db.query.profiles.findFirst({
    where(profiles, { eq }) {
      // baru pertama kali, belum ada profil yang dipilih
      if (!profileId) {
        return undefined
      }

      return eq(profiles.id, profileId)
    },
  })

  // ada kemungkinan profile yang terakhir dipake dihapus dari db
  if (profile === undefined) {
    profile = await db.query.profiles.findFirst()
  }

  if (profile === undefined) {
    // table profiles kosong
    const newProfile: typeof profiles.$inferInsert = {
      name: 'Default',
      settings: defaultSettings(),
    }

    const results = await db.insert(profiles).values(newProfile).returning({ id: profiles.id })

    newProfile.id = results[0]!.id

    profile = newProfile as typeof profiles.$inferSelect
  } else {
    profile.settings = parse(profile.settings)
  }

  const upgradeSuccess = server.upgrade(request, {
    data: {
      id:
        isProduction() && version !== '$INJECT_VERSION$'
          ? ''
          : (isProduction() ? id : globalForId.id).toString(36),
      profile,
    } satisfies WebSocketData,
  })

  if (upgradeSuccess) {
    if (isProduction()) {
      id++
    } else {
      globalForId.id++
    }
  }

  return upgradeSuccess
}
