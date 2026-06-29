import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 注册 Service Worker（离线缓存 + PWA）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/fitman2/sw.js')
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)