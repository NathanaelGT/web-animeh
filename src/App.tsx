import { StrictMode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import TRPCReactProvider from '~c/TRPCReactProvider'
import { createRouter } from '~/router'
import '~c/index.css'

const router = createRouter()

export const App = () => {
  return (
    <StrictMode>
      <TRPCReactProvider>
        <RouterProvider router={router} />
      </TRPCReactProvider>
    </StrictMode>
  )
}
