import { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import ChecklistScreen from './components/ChecklistScreen'
import ChangePasswordScreen from './components/ChangePasswordScreen'
import AdminDashboard from './components/AdminDashboard'
import DailyDashboard from './components/DailyDashboard'
import './App.css'

const API_URL = 'https://shiftcrew-production.up.railway.app'

function App() {
  const [token, setToken] = useState(localStorage.getItem('session_token'))
  const [staffId, setStaffId] = useState(localStorage.getItem('staff_id'))
  const [currentStaff, setCurrentStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firstLogin, setFirstLogin] = useState(false)
  const [roleId, setRoleId] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('dashboard')

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
          setCurrentStaff({ id: data.id, email: data.email, name: data.name, sessionToken: token })
          setFirstLogin(data.first_login || false)
          setRoleId(data.role_id)
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
    setCurrentStaff({ ...staffData, sessionToken: loginToken })
    setFirstLogin(staffData.first_login || false)
    setRoleId(staffData.role_id)
    console.log('State updated')
  }

  const handlePasswordChanged = () => {
    setFirstLogin(false)
    setCurrentScreen('dashboard')
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

  const isAdmin = currentStaff?.email === 'amb@grscorp.us'

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {!token ? (
        <LoginScreen onLogin={handleLogin} apiUrl={API_URL} />
      ) : firstLogin ? (
        <ChangePasswordScreen user={currentStaff} onPasswordChanged={handlePasswordChanged} apiUrl={API_URL} />
      ) : (
        <>
          {isAdmin && (
            <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
              <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className={`px-4 py-2 rounded font-medium transition ${
                      currentScreen === 'dashboard'
                        ? 'bg-teal-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => setCurrentScreen('admin')}
                    className={`px-4 py-2 rounded font-medium transition ${
                      currentScreen === 'admin'
                        ? 'bg-teal-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setCurrentScreen('daily-dashboard')}
                    className={`px-4 py-2 rounded font-medium transition ${
                      currentScreen === 'daily-dashboard'
                        ? 'bg-teal-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
          {currentScreen === 'dashboard' || !isAdmin ? (
            <ChecklistScreen token={token} staffId={staffId} currentStaff={currentStaff} onLogout={handleLogout} apiUrl={API_URL} />
          ) : currentScreen === 'admin' ? (
            <AdminDashboard user={currentStaff} apiUrl={API_URL} sessionToken={token} />
          ) : (
            <DailyDashboard token={token} apiUrl={API_URL} facilityId={1} />
          )}
        </>
      )}
    </div>
  )
}

export default App
