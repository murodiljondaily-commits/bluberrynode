import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { preloadPhrases } from './lib/voiceSystem'

// Warm up Yandex TTS cache for common Uzbek UI phrases
preloadPhrases()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
