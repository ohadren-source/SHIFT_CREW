// comment
import { useState, useEffect } from 'react'
import TaskCard from './TaskCard'

export default function ChecklistScreen({ token, staffId, currentStaff, onLogout, apiUrl }) {
  const [tasks, setTasks] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const shifts = [
    { id: 1, name: '1st Shift (AM)', time: '6:00 AM - 2:00 PM' },
    { id: 2, name: '2nd Shift (Midday)', time: '2:00 PM - 10:00 PM' },
    { id: 3, name: '3rd Shift (PM)', time: '10:00 PM - 6:00 AM' },
    { id: 4, name: 'Weekend Shift', time: '6:00 AM - 10:00 PM' }
  ]

  useEffect(() => {
    fetchTasks()
  }, [selectedShift])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/tasks?shift_id=${selectedShift}&facility_id=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setTasks(data || {})
      if (Object.keys(data || {}).length > 0) {
        setSelectedRoom(Object.keys(data)[0])
      }
    } catch (err) {
      setMessage('Failed to load tasks')
    }
    setLoading(false)
  }

  const handleTaskChange = (taskId, status, notes = '') => {
    setTasks(prev => ({
      ...prev,
      [selectedRoom]: prev[selectedRoom].map(task =>
        task.id === taskId ? { ...task, status, notes } : task
      )
    }))
  }

  const handleSubmitTasks = async () => {
    setSubmitting(true)
    const roomTasks = tasks[selectedRoom] || []
    
    try {
      for (const task of roomTasks) {
        if (task.status) {
          await fetch(`${apiUrl}/task-entry`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              task_id: task.id,
              staff_id: staffId,
              shift_id: selectedShift,
              facility_id: 1,
              status: task.status,
              notes: task.notes || null
            })
          })
        }
      }
      setMessage('Tasks submitted successfully!')
      setTimeout(() => setMessage(''), 3000)

      // Refetch to ensure state matches backend
      await fetchTasks()
    } catch (err) {
      setMessage('Error submitting tasks')
    }
    setSubmitting(false)
  }

  const currentShift = shifts.find(s => s.id === selectedShift)
  const roomList = Object.keys(tasks)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SHIFT_CREW" className="h-16" />
            <div>
              <h1 className="text-4xl font-bold text-teal-400">SHIFT_CREW</h1>
              <p className="text-gray-400">Welcome, {currentStaff.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium"
          >
            Sign Out
          </button>
        </div>

        {/* Shift Selector */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {shifts.map(shift => (
            <button
              key={shift.id}
              onClick={() => setSelectedShift(shift.id)}
              className={`p-4 rounded-lg border-2 transition ${
                selectedShift === shift.id
                  ? 'border-teal-400 bg-teal-900 text-teal-100'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="font-bold">{shift.name}</div>
              <div className="text-sm">{shift.time}</div>
            </button>
          ))}
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded ${message.includes('success') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Room Navigation */}
          <div className="col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-6">
              <h2 className="font-bold text-lg text-teal-400 mb-4">Rooms & Areas</h2>
              <div className="space-y-2">
                {roomList.map(room => (
                  <button
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full text-left px-4 py-2 rounded transition ${
                      selectedRoom === room
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="col-span-2">
            {loading ? (
              <div className="text-gray-400">Loading tasks...</div>
            ) : selectedRoom && tasks[selectedRoom] ? (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedRoom}</h2>
                {tasks[selectedRoom].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onChange={handleTaskChange}
                  />
                ))}

                <button
                  onClick={handleSubmitTasks}
                  disabled={submitting}
                  className="w-full mt-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Room Tasks'}
                </button>
              </div>
            ) : (
              <div className="text-gray-400">Select a room to view tasks</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
