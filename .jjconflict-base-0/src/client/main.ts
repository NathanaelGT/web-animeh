import ReactDOM from 'react-dom/client'
import { App } from '~/App'
import { root } from './elements'

export const scrollbarWidth = root.offsetWidth - root.clientWidth

root.removeAttribute('style')

ReactDOM.createRoot(root).render(App())
