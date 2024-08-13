import { observable } from '@trpc/server/observable'
import { procedure, router } from '~s/trpc'
import {
  downloadProgress,
  downloadProgressSnapshot,
  type DownloadProgressData,
} from '~s/external/download/progress'

export const DownloadRouter = router({
  list: procedure.subscription(async () => {
    type DownloadList = Record<string, string>

    return observable<DownloadList>(emit => {
      const downloadList: DownloadList = {}

      const handleUpdate = (data: DownloadProgressData, name: string) => {
        if (data.text) {
          downloadList[name] = data.text
        }

        if (data.done) {
          setTimeout(() => {
            delete downloadList[name]

            emit.next(downloadList)
          }, 100)
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
})
