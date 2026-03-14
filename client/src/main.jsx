import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

console.log('🚀 Initializing Main Entry...');

createRoot(document.getElementById('root')).render(
  // Temporarily disabled StrictMode to fix infinite render loop
  // <StrictMode>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
  // </StrictMode>,
)
