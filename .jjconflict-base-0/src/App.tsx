import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import TRPCReactProvider from '~c/TRPCReactProvider'
import { router } from '~/router'
import '~c/index.css'

export const App = () => {
  return (
    <StrictMode>
      <TRPCReactProvider>
        <RouterProvider router={router} />
      </TRPCReactProvider>
    </StrictMode>
  )
}
