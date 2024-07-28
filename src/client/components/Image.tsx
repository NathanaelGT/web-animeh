import type { JSX } from 'react'
import { useImage } from '../hooks/useImage'

namespace Image {
  export type Props = JSX.IntrinsicElements['img'] & {
    src: string
  }
}

export const Image = (props: Image.Props) => {
  const src = useImage(props.src)

  return <img {...props} src={src} />
}
