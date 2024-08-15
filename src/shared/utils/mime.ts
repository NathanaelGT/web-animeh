export const getImageMimeType = (extension: string) => {
  if (extension === 'webp') {
    return 'image/webp'
  } else if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg'
  } else if (extension === 'png') {
    return 'image/png'
  }
  return 'application/octet-stream'
}
