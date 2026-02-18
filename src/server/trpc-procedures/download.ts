import { observable } from '@trpc/server/observable'
import * as v from 'valibot'
import { downloadMeta } from '~s/external/download/meta'
import {
  downloadProgress,
  downloadProgressSnapshot,
  downloadProgressController,
  type DownloadProgressData,
} from '~s/external/download/progress'
import { procedure, router } from '~s/trpc'
import { omit } from '~/shared/utils/object'
import type { DownloadProgressDataWithoutDone } from '~s/db/repository/episode'

export const DownloadRouter = router({
  list: procedure.subscription(async () => {
    type DownloadList = Record<string, DownloadProgressDataWithoutDone>

    return observable<DownloadList>(emit => {
      const downloadList: DownloadList = {}

      const handleUpdate = (data: DownloadProgressData, name: string) => {
        downloadList[name] = omit(data, 'done') as DownloadProgressDataWithoutDone

        if (data.done) {
          setTimeout(() => {
            delete downloadList[name]

            emit.next(downloadList)
          }, 250)
        }
      }

      downloadProgressSnapshot.forEach(handleUpdate)

      emit.next(downloadList)

      const downloadProgressHandler = (name: string, data: DownloadProgressData) => {
        handleUpdate(data, name)

        emit.next(downloadList)
      }

      downloadProgress.on('*', downloadProgressHandler)

      return () => {
        downloadProgress.off('*', downloadProgressHandler)
      }
    })
  }),

  stop: procedure
    .input(v.parser(v.object({ name: v.string(), type: v.picklist(['cancel', 'pause']) })))
    .mutation(async ({ input }) => {
      const controller = downloadProgressController.get(input.name)

      if (controller) {
        controller.abort(input.type)

        return true
      } else {
        return false
      }
    }),

  meta: procedure.input(v.parser(v.string())).query(({ input }) => {
    return downloadMeta.get(input)
  }),
})
