import mitt from 'mitt'
import * as v from 'valibot'
import { eq } from 'drizzle-orm'
import { observable } from '@trpc/server/observable'
import { profiles, type Profile } from '~s/db/schema'
import { procedure, router } from '~s/trpc'
import { logger } from '~s/utils/logger'
import { defaultSettings, parse, settingsSchema } from '~/shared/profile/settings'

const profileSchema = v.object({
  name: v.string(),
  settings: settingsSchema,
})

const emitter = mitt<Record<number, Profile>>()

export const ProfileRouter = router({
  subs: procedure.subscription(({ ctx }) => {
    return observable<Profile>(emit => {
      emit.next(ctx.data.profile)

      // @ts-ignore
      ctx.data.__changeProfile = emit.next

      emitter.on(ctx.data.profile.id, emit.next)

      return () => {
        emitter.off(ctx.data.profile.id, emit.next)
      }
    })
  }),

  list: procedure.mutation(async ({ ctx }) => {
    const profiles = await ctx.db.query.profiles.findMany({
      columns: {
        name: true,
      },
    })

    return profiles.map(profile => profile.name)
  }),

  change: procedure.input(v.parser(v.string())).mutation(async ({ input, ctx }) => {
    const newProfile = await ctx.db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.name, input),
    })

    if (newProfile === undefined) {
      return
    }

    newProfile.settings = parse(newProfile.settings)

    // @ts-ignore
    ctx.data.__changeProfile(newProfile)
  }),

  create: procedure.input(v.parser(v.string())).mutation(async ({ input, ctx }) => {
    const newProfile: typeof profiles.$inferInsert = {
      name: input,
      settings: defaultSettings(),
    }

    const results = await ctx.db.insert(profiles).values(newProfile).returning({ id: profiles.id })

    newProfile.id = results[0]!.id

    // @ts-ignore
    ctx.data.__changeProfile(newProfile)
    ctx.data.profile = newProfile as typeof profiles.$inferSelect
  }),

  update: procedure.input(v.parser(profileSchema)).mutation(async ({ input, ctx }) => {
    const newProfileData = input as Profile

    try {
      await ctx.db.update(profiles).set(newProfileData).where(eq(profiles.id, ctx.data.profile.id))

      newProfileData.id = ctx.data.profile.id
      ctx.data.profile = newProfileData

      emitter.emit(ctx.data.profile.id, ctx.data.profile)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('UNIQUE constraint failed')) {
        throw new Error('Nama profil ini sudah digunakan')
      }

      logger.error('Failed to update profile data', { error })
    }
  }),
})
