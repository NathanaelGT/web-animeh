import { Skeleton as BaseSkeleton } from '@/ui/skeleton'
import type { ReactNode } from 'react'
import type { InferOutput } from 'valibot'
import type { settingsSchema } from '~/shared/profile/settings'

type KeybindTranslation = InferOutput<typeof settingsSchema>['keybind']

type KeybindGroupTranslation = {
  [group in keyof KeybindTranslation]: [string, string | ReactNode]
}

type KeybindGroupConflicts = (keyof KeybindTranslation)[][]

export const keybindGroupTranslation = (() => {
  let skeletonKey = 0
  function Skeleton(width: `w-${string}`) {
    return <BaseSkeleton key={skeletonKey++} className={`mb-[.25rem] h-[.55rem] ${width}`} />
  }

  let descriptionKey = 0
  function Description(...text: (string | JSX.Element)[]) {
    return (
      <div key={descriptionKey++} className="flex items-end">
        {text}
      </div>
    )
  }

  return {
    global: ['Global keybind', 'Keybind untuk disemua halaman'],
    animePage: ['Halaman anime', Description(origin + '/anime/', Skeleton('w-12'))],
    watchPage: [
      'Halaman nonton anime',
      Description(origin + '/anime/', Skeleton('w-12'), '/episode/', Skeleton('w-4')),
    ],
    videoPlayer: [
      'Pemutar video',
      [
        Description(origin + '/anime/', Skeleton('w-12'), '/episode/', Skeleton('w-4')),
        <p key={descriptionKey++} className="text-primary/40">
          Saat sedang menonton.
        </p>,
      ],
    ],
  } satisfies KeybindGroupTranslation
})()

export const keybindTranslation = {
  global: {
    search: ['Fokus ke input pencarian'],
    showKeybindTips: ['Tampilkan petunjuk keybind'],
  },
  animePage: {
    watch: ['Nonton anime'],
  },
  watchPage: {
    search: ['Cari episode'],
    download: ['Unduh episode sekarang', 'Saat episode belum terunduh'],
  },
  videoPlayer: {
    back: ['Mundur normal'],
    forward: ['Maju normal'],
    longBack: ['Mundur jauh'],
    longForward: ['Maju jauh'],
    volumeUp: ['Naikkan volume'],
    volumeDown: ['Turunkan volume'],
    toStart: ['Mulai dari awal'],
    toEnd: ['Pindah ke akhir'],
    previous: ['Episode sebelumnya'],
    next: ['Episode selanjutnya'],
    mute: ['Toggle mute'],
    PiP: ['Toggle picture in picture'],
    fullscreen: ['Toggle fullscreen'],
    playPause: ['Play/Pause'],
  },
} satisfies KeybindTranslation

export const keybindGroupConflicts: KeybindGroupConflicts = [['watchPage', 'videoPlayer']]

for (const group in keybindTranslation) {
  if (group !== 'global') {
    keybindGroupConflicts.push(['global', group as keyof typeof keybindTranslation])
  }
}
