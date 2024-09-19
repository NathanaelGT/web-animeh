import ReactDOM from 'react-dom/client'
import { App } from '~/App'

const root = document.getElementById('root')!

export const scrollbarWidth = root.offsetWidth - root.clientWidth

root.removeAttribute('style')

ReactDOM.createRoot(root).render(App())

setTimeout(() => {
  const videoKeydownHandler = (event: KeyboardEvent) => {
    const defaultKeybindKeys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      ' ',
      'Home',
      'End',
    ]

    if (defaultKeybindKeys.includes(event.key)) {
      event.preventDefault()
    }
  }

  document
    .querySelector<HTMLVideoElement>('video#player')!
    .addEventListener('keydown', videoKeydownHandler, true)
})
