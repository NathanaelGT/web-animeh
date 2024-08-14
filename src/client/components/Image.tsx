import type { JSX } from 'react'
import { useImage } from '~c/hooks/useImage'

namespace Image {
  export type Props = Omit<JSX.IntrinsicElements['img'], 'src'> & {
    src: string | number
  }
}

export const Image = (props: Image.Props) => {
  const src = useImage(props.src.toString())

  return <img {...props} src={src} />
}
