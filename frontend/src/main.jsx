import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Auth.css'
import { RouterProvider } from './context/RouterContext'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RouterProvider>
  </StrictMode>,
)
