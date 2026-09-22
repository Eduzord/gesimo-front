import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { sincronizarSessao } from './utils/auth.js'

// Garante nome e papel corretos (lidos do JWT) mesmo em sessões abertas antes desta correção
sincronizarSessao()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
