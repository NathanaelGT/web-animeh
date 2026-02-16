import { db } from '~s/db'
import { profiles } from '~s/db/schema'
import { defaultSettings, parse } from '~/shared/profile/settings'
import type { WebSocketData } from '~s/index'

const globalForId = globalThis as unknown as {
  id: number
}
if (!Bun.env.PROD) {
  globalForId.id ??= 1
}

let id = 1

export const handleWebsocketRequest = async (
  request: Request,
  server: Bun.Server<WebSocketData>,
  path: string,
) => {
  const [version, profileIdString] = path.split('&')
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
      req: request,
      id:
        Bun.env.PROD && version !== '$INJECT_VERSION$'
          ? ''
          : (Bun.env.PROD ? id : globalForId.id).toString(36),
      profile,
    },
  })

  if (upgradeSuccess) {
    if (Bun.env.PROD) {
      id++
    } else {
      globalForId.id++
    }
  }

  return upgradeSuccess
}
