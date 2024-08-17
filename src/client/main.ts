import ReactDOM from 'react-dom/client'
import { App } from '~/App'

ReactDOM.createRoot(document.getElementById('root')!).render(App())

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
