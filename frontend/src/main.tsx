import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initErrorShim, ErrorBoundary } from './errorshim'
import './styles.css'
import App from './App'

initErrorShim()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter><App /></BrowserRouter>
  </ErrorBoundary>,
)
