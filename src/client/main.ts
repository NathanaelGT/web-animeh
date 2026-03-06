import ReactDOM from 'react-dom/client'
import { App } from '~/App'
import { root, videoEl } from './elements'

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

  videoEl.addEventListener('keydown', videoKeydownHandler, true)
})
