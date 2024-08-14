import { useRef, useEffect } from 'react'

type Props = React.VideoHTMLAttributes<HTMLVideoElement>

export function AutoplayVideo(props: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    video.muted = true
    video.play().then(() => {
      video.muted = false
    })
  }, [])

  return <video ref={videoRef} {...props} />
}
