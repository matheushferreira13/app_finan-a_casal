import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false })
document.addEventListener('gesturechange', (event) => event.preventDefault(), { passive: false })
document.addEventListener('gestureend', (event) => event.preventDefault(), { passive: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
