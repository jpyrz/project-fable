import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GameProvider } from './state/GameContext'
import { CelebrationProvider } from './components/Celebration'
import App from './App'
import './styles/global.scss'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GameProvider><CelebrationProvider><App /></CelebrationProvider></GameProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
