import { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import ChecklistScreen from './components/ChecklistScreen'
import './App.css'

const API_URL = 'http://localhost:8000'

function App() {
  const [token, setToken] = useState(localStorage.getItem('session_token'))
  const [staffId, setStaffId] = useState(localStorage.getItem('staff_id'))
  const [currentStaff, setCurrentStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      console.log('Token found:', token.substring(0, 20) + '...')
      fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          console.log('Current user:', data)
          setStaffId(data.id)
          setCurrentStaff({ id: data.id, email: data.email, name: data.name })
        })
        .catch(err => {
          console.error('Failed to fetch current user:', err)
          localStorage.removeItem('session_token')
          localStorage.removeItem('staff_id')
          setToken(null)
          setStaffId(null)
        })
        .finally(() => setLoading(false))
    } else {
      console.log('No token found')
      setLoading(false)
    }
  }, [token])

  const handleLogin = (loginToken, staffData) => {
    console.log('handleLogin called with token:', loginToken.substring(0, 20) + '...')
    console.log('staffData:', staffData)
    localStorage.setItem('session_token', loginToken)
    localStorage.setItem('staff_id', staffData.id)
    console.log('Token saved to localStorage')
    setToken(loginToken)
    setStaffId(staffData.id)
    setCurrentStaff(staffData)
    console.log('State updated')
  }

  const handleLogout = () => {
    localStorage.removeItem('session_token')
    localStorage.removeItem('staff_id')
    setToken(null)
    setStaffId(null)
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
        <ChecklistScreen token={token} staffId={staffId} currentStaff={currentStaff} onLogout={handleLogout} apiUrl={API_URL} />
      )}
    </div>
  )
}

export default App
