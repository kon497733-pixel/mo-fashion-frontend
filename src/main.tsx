import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🚀১. গ্লোবাল ডাটাবেস অটো-ইনিশিয়ালাইজার ইমপোর্ট
import { initStoreData } from './data/initialData'

// 🚀 ২. ওয়েবসাইট যেকোনো নতুন ডিভাইসে লোড হওয়া মাত্রই রান হবে
initStoreData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)