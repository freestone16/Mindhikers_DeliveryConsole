import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './SaaSApp.tsx'
import { AuthBoundary } from './auth/AuthBoundary'
import { AuthProvider } from './auth/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthBoundary>
        <App />
      </AuthBoundary>
    </AuthProvider>
  </StrictMode>,
)
