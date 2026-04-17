import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import SaaSApp from './SaaSApp.tsx'
import { AuthBoundary } from './auth/AuthBoundary'
import { AuthProvider } from './auth/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthBoundary>
          <SaaSApp />
        </AuthBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
