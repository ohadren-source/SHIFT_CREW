import { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import ChecklistScreen from './components/ChecklistScreen'
import './App.css'

const API_URL = 'https://shiftcrew-production.up.railway.app'

function App() {
  const [token, setToken] = useState(localStorage.getItem('session_token'))
  const [currentStaff, setCurrentStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      // Token exists in localStorage, user is logged in
      try {
        console.log('Token found:', token.substring(0, 20) + '...')
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('Token payload:', payload)
        setCurrentStaff({ id: payload.sub })
        console.log('Current staff set to:', payload.sub)
      } catch (err) {
        console.error('Invalid token:', err)
        localStorage.removeItem('session_token')
        setToken(null)
      }
      setLoading(false)
    } else {
      console.log('No token found')
      setLoading(false)
    }
  }, [token])

  const handleLogin = (loginToken, staffData) => {
    console.log('handleLogin called with token:', loginToken.substring(0, 20) + '...')
    console.log('staffData:', staffData)
    localStorage.setItem('session_token', loginToken)
    console.log('Token saved to localStorage')
    setToken(loginToken)
    setCurrentStaff(staffData)
    console.log('State updated')
  }

  const handleLogout = () => {
    localStorage.removeItem('session_token')
    setToken(null)
    setCurrentStaff(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {!token ? (
        <LoginScreen onLogin={handleLogin} apiUrl={API_URL} />
      ) : (
        <ChecklistScreen token={token} currentStaff={currentStaff} onLogout={handleLogout} apiUrl={API_URL} />
      )}
    </div>
  )
}

export default App
