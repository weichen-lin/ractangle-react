import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './src/App'
import './global.css'

const container = document.getElementById('root')
const root = createRoot(container as HTMLDivElement)
root.render(<App />)
