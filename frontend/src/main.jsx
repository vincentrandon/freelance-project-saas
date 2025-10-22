import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import App from './App.jsx'
import { AuthProvider } from './utils/AuthContext'
import './i18n' // Import i18n configuration
import 'moment/locale/fr' // Import French locale for Moment.js
import './css/style.css'
import 'tippy.js/dist/tippy.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <App />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
