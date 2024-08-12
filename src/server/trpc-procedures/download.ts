import { observable } from '@trpc/server/observable'
import { procedure, router } from '~s/trpc'
import { downloadProgress, downloadProgressSnapshot } from '~s/external/download/progress'

export const DownloadRouter = router({
  list: procedure.subscription(async () => {
    type DownloadList = Record<string, string>

    return observable<DownloadList>(emit => {
      const downloadList: DownloadList = {}

      const handleUpdate = (data: { text: string; done?: boolean }, name: string) => {
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

      downloadProgress.on('*', (name, data) => {
        handleUpdate(data, name)

        emit.next(downloadList)
      })
    })
  }),
})
