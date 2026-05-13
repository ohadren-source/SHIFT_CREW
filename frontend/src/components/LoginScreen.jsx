import { useState } from 'react'

export default function LoginScreen({ onLogin, apiUrl }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      console.log('Login response:', data)

      if (!res.ok) {
        setError(data.message || 'Login failed')
        setLoading(false)
        return
      }

      console.log('Login successful, token:', data.session_token)
      localStorage.setItem('staff_id', data.id)
      onLogin(data.session_token, { id: data.id, email: data.email, name: data.name })
    } catch (err) {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SHIFT_CREW" className="h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-teal-400">SHIFT_CREW</h1>
          <p className="text-gray-400 mt-2">Task Management for Hospitality Staff</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="p-3 bg-red-900 text-red-200 rounded text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
