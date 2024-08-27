import { observable } from '@trpc/server/observable'
import * as v from 'valibot'
import { procedure, router } from '~s/trpc'
import {
  downloadProgress,
  downloadProgressSnapshot,
  downloadProgressController,
  type DownloadProgressData,
} from '~s/external/download/progress'

export const DownloadRouter = router({
  list: procedure.subscription(async () => {
    type DownloadList = Record<string, string>

    return observable<DownloadList>(emit => {
      const downloadList: DownloadList = {}

      const handleUpdate = (data: DownloadProgressData, name: string) => {
        downloadList[name] = data.text

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

  cancel: procedure.input(v.parser(v.string())).mutation(async ({ input }) => {
    const controller = downloadProgressController.get(input)

    if (controller) {
      controller.abort()

      return true
    } else {
      return false
    }
  }),
})
