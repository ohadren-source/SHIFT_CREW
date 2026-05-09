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
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentStaff({ id: payload.sub })
      } catch (err) {
        console.error('Invalid token:', err)
        localStorage.removeItem('session_token')
        setToken(null)
      }
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [token])

  const handleLogin = (loginToken, staffData) => {
    localStorage.setItem('session_token', loginToken)
    setToken(loginToken)
    setCurrentStaff(staffData)
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
