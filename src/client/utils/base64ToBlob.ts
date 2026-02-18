import Base64ToBlobWorker from '~c/worker/base64ToBlob?worker&inline'

export const base64ToBlob = (() => {
  let jobId = 0

  const requests = new Map<number, (value: Blob) => void>()
  const worker = new Base64ToBlobWorker()

  worker.onmessage = e => {
    const [id, blob] = e.data as [number, Blob]

    requests.get(id)!(blob)
    requests.delete(id)
  }

  return (base64: string, type: string) => {
    if (base64 === '') {
      return Promise.resolve(null)
    }

    worker.postMessage([++jobId, base64, type])

    return new Promise<Blob>(resolve => {
      requests.set(jobId, resolve)
    })
  }
})()
