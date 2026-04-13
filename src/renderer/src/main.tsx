import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// KaTeX stylesheet for <InlineMath> / <BlockMath> components (LaTeX rendering).
import 'katex/dist/katex.min.css'
// IMPORTANT: i18n must be imported before App so that resources are registered
// and the initial language is resolved before React renders any component.
import '@i18n/index'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
