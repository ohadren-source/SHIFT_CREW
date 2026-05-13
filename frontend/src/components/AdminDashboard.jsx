import { useState, useEffect } from 'react'

export default function AdminDashboard({ user, apiUrl, sessionToken }) {
  const [tab, setTab] = useState('staff')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState([])
  const [roles, setRoles] = useState([])
  const [facilities, setFacilities] = useState([])
  const [tasks, setTasks] = useState([])
  const [taskRoom, setTaskRoom] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskRoleId, setTaskRoleId] = useState('')
  const [taskIsCritical, setTaskIsCritical] = useState(false)

  // Fetch roles and facilities on mount
  useEffect(() => {
    fetchRoles()
    fetchFacilities()
    fetchStaff()
    fetchTasks()
  }, [facilityId])

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${apiUrl}/roles`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRoles(data)
        if (data.length > 0 && !roleId) setRoleId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    }
  }

  const fetchFacilities = async () => {
    try {
      const res = await fetch(`${apiUrl}/facilities`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setFacilities(data)
        if (data.length > 0 && !facilityId) setFacilityId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch facilities:', err)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/staff`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          email,
          name,
          role_id: parseInt(roleId),
          facility_id: parseInt(facilityId)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to create staff')
        setLoading(false)
        return
      }

      const newStaff = await res.json()
      setSuccess(`Staff created: ${newStaff.name} (${newStaff.temp_password})`)
      setEmail('')
      setName('')
      fetchStaff()
    } catch (err) {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    if (!facilityId) return
    try {
      const res = await fetch(`${apiUrl}/admin/tasks?facility_id=${facilityId}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    }
  }

  const handleDelete = async (staffId) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      const res = await fetch(`${apiUrl}/admin/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.detail || 'Failed to delete staff')
        return
      }

      fetchStaff()
    } catch (err) {
      alert('Network error')
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${apiUrl}/admin/tasks?facility_id=${facilityId}&room=${encodeURIComponent(taskRoom)}&task_name=${encodeURIComponent(taskName)}&assigned_role=${taskRoleId}&is_critical=${taskIsCritical}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to create task')
        return
      }

      setSuccess('Task created successfully')
      setTaskRoom('')
      setTaskName('')
      setTaskRoleId('')
      setTaskIsCritical(false)
      fetchTasks()
    } catch (err) {
      setError('Network error. Try again.')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return

    try {
      const res = await fetch(`${apiUrl}/admin/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      })

      if (!res.ok) {
        alert('Failed to delete task')
        return
      }

      fetchTasks()
    } catch (err) {
      alert('Network error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-400 mb-8">Admin Dashboard</h1>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('staff')}
            className={`px-6 py-2 rounded font-medium transition ${
              tab === 'staff'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`px-6 py-2 rounded font-medium transition ${
              tab === 'tasks'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tasks
          </button>
        </div>

        {tab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Staff Form */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create Staff Account</h2>

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
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={loading}
                >
                  <option value="">Select role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Facility</label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={loading}
                >
                  <option value="">Select facility...</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && <div className="p-3 bg-red-900 text-red-200 rounded text-sm">{error}</div>}
              {success && <div className="p-3 bg-green-900 text-green-200 rounded text-sm">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Staff'}
              </button>
            </form>
          </div>

          {/* Staff List */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Staff List</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {staff.length === 0 ? (
                <p className="text-gray-400">No staff created yet</p>
              ) : (
                staff.map((s) => (
                  <div key={s.id} className="bg-gray-700 p-4 rounded border border-gray-600 flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{s.name}</p>
                      <p className="text-gray-300 text-sm">{s.email}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {roles.find(r => r.id === s.role_id)?.name || 'Unknown'} •
                        {facilities.find(f => f.id === s.facility_id)?.name || 'Unknown'}
                      </p>
                    </div>
                    {s.id !== user.id && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {tab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Task Form */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create Task</h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Room/Area</label>
                <select
                  value={taskRoom}
                  onChange={(e) => setTaskRoom(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={!facilityId}
                >
                  <option value="">Select room...</option>
                  {[...new Set(tasks.map(t => t.room))].sort().map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={!facilityId}
                  placeholder="e.g., Bed made"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Assigned Role</label>
                <select
                  value={taskRoleId}
                  onChange={(e) => setTaskRoleId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                  required
                  disabled={!facilityId}
                >
                  <option value="">Select role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="critical"
                  checked={taskIsCritical}
                  onChange={(e) => setTaskIsCritical(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="critical" className="text-sm text-gray-300">Mark as critical</label>
              </div>

              {error && <div className="p-3 bg-red-900 text-red-200 rounded text-sm">{error}</div>}
              {success && <div className="p-3 bg-green-900 text-green-200 rounded text-sm">{success}</div>}

              <button
                type="submit"
                disabled={!facilityId}
                className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded transition disabled:opacity-50"
              >
                Create Task
              </button>
            </form>
          </div>

          {/* Tasks List */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Tasks</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {!facilityId ? (
                <p className="text-gray-400">Select a facility to see tasks</p>
              ) : tasks.length === 0 ? (
                <p className="text-gray-400">No tasks created yet</p>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="bg-gray-700 p-4 rounded border border-gray-600 flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{t.task_name}</p>
                      <p className="text-gray-300 text-sm">{t.room}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {roles.find(r => r.id === t.assigned_role)?.name || 'Unknown'}
                        {t.is_critical && ' • Critical'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
