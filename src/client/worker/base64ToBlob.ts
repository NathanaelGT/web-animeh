declare const self: Worker

self.addEventListener('message', e => {
  const [id, base64, type] = e.data as [number, string, string]

  const binaryString = atob(base64)

  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  self.postMessage([id, new Blob([bytes], { type })])
})
