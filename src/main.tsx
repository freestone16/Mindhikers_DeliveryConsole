import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import SaaSApp from './SaaSApp.tsx'
import { AuthBoundary } from './auth/AuthBoundary'
import { AuthProvider } from './auth/AuthProvider'
import { queryClient } from './lib/query-client'
import { ShellErrorBoundary } from './shell/error-boundaries'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShellErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AuthBoundary>
              <SaaSApp />
            </AuthBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ShellErrorBoundary>
  </StrictMode>,
)
