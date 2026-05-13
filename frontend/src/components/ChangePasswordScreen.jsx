import { useState } from 'react'

export default function ChangePasswordScreen({ user, onPasswordChanged, apiUrl }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `${apiUrl}/auth/change-password?old_password=${encodeURIComponent(oldPassword)}&new_password=${encodeURIComponent(newPassword)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.sessionToken}`
          }
        }
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to change password')
        setLoading(false)
        return
      }

      onPasswordChanged()
    } catch (err) {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-400">Change Password</h1>
          <p className="text-gray-400 mt-2">First login required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              required
              disabled={loading}
              placeholder="Your temporary password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              required
              disabled={loading}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              required
              disabled={loading}
              placeholder="Re-enter your new password"
            />
          </div>

          {error && <div className="p-3 bg-red-900 text-red-200 rounded text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded transition disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
