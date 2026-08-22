import { createRoot } from 'react-dom/client'
import { initErrorShim } from './errorshim'
import './styles.css'

initErrorShim()

function App() {
  return (
    <main>
      <p className="eyebrow">ClientOps</p>
      <h1>Operational delivery, visible.</h1>
      <p>Bootstrap complete. Product modules follow the delivery plan.</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
