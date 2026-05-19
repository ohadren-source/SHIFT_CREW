// comment
import { useState, useEffect } from 'react'
import TaskCard from './TaskCard'

export default function ChecklistScreen({ token, staffId, currentStaff, onLogout, apiUrl, lockedShift }) {
  const shifts = [
    { id: 1, name: '1st Shift (AM)', time: '6:00 AM - 2:00 PM' },
    { id: 2, name: '2nd Shift (Midday)', time: '2:00 PM - 10:00 PM' },
    { id: 3, name: '3rd Shift (PM)', time: '10:00 PM - 6:00 AM' },
    { id: 4, name: 'Weekend Shift', time: '6:00 AM - 10:00 PM' }
  ]

  const allRooms = [
    "Azlan's Room",
    "Azlan's Bathroom",
    "Asad's Room",
    "Asad's Bathroom",
    "Study Room",
    "Kitchen",
    "Dining Area",
    "Sitting Area",
    "Hallways",
    "Downstairs Bathroom",
    "Stairs",
    "Office",
    "Pets",
    "Laundry",
    "Final Checks"
  ]

  const [tasks, setTasks] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState(lockedShift || 1)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [rooms, setRooms] = useState(allRooms)
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [notes, setNotes] = useState([])
  const [expandedNotes, setExpandedNotes] = useState({})
  const [newNote, setNewNote] = useState('')
  const [supplies, setSupplies] = useState([])
  const [newSupplyName, setNewSupplyName] = useState('')
  const [newSupplyQty, setNewSupplyQty] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchNotesAndSupplies()
  }, [selectedShift])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/tasks?shift_id=${selectedShift}&facility_id=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()

      // Fetch entries to restore status
      const today = new Date().toISOString().split('T')[0]
      const entriesRes = await fetch(`${apiUrl}/task-entries?shift_id=${selectedShift}&facility_id=1&date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const { entries } = await entriesRes.json()
      const statusMap = {}
      entries.forEach(e => { statusMap[e.task_id] = e })

      // Restore status and notes to tasks
      const tasksWithStatus = {}
      Object.keys(data || {}).forEach(room => {
        tasksWithStatus[room] = (data[room] || []).map(task => ({
          ...task,
          status: statusMap[task.id]?.status,
          notes: statusMap[task.id]?.notes
        }))
      })

      setTasks(tasksWithStatus)
      // Update rooms list to include all rooms from API response
      const apiRooms = Object.keys(tasksWithStatus)
      const allRoomsList = [...new Set([...allRooms, ...apiRooms])].sort()
      setRooms(allRoomsList)
      if (apiRooms.length > 0) {
        setSelectedRoom(apiRooms[0])
      }
    } catch (err) {
      setMessage('Failed to load tasks')
    }
    setLoading(false)
  }

  const fetchNotesAndSupplies = async () => {
    try {
      const [notesRes, suppliesRes] = await Promise.all([
        fetch(`${apiUrl}/notes?facility_id=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/supplies?facility_id=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      const notesData = await notesRes.json()
      const suppliesData = await suppliesRes.json()
      setNotes(notesData.notes || [])
      setSupplies(suppliesData.supplies || [])
    } catch (err) {
      console.error('Failed to fetch notes/supplies:', err)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      const res = await fetch(`${apiUrl}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newNote,
          facility_id: 1
        })
      })
      if (res.ok) {
        setNewNote('')
        await fetchNotesAndSupplies()
      }
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await fetch(`${apiUrl}/note/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await fetchNotesAndSupplies()
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleAddSupply = async () => {
    if (!newSupplyName.trim() || !newSupplyQty) return

    try {
      const res = await fetch(`${apiUrl}/supply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          supply_name: newSupplyName,
          quantity: parseInt(newSupplyQty),
          facility_id: 1
        })
      })
      if (res.ok) {
        setNewSupplyName('')
        setNewSupplyQty('')
        await fetchNotesAndSupplies()
      }
    } catch (err) {
      console.error('Failed to add supply:', err)
    }
  }

  const handleDeleteSupply = async (supplyId) => {
    try {
      await fetch(`${apiUrl}/supply/${supplyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await fetchNotesAndSupplies()
    } catch (err) {
      console.error('Failed to delete supply:', err)
    }
  }

  const handleTaskChange = (taskId, status, notes = '') => {
    setTasks(prev => ({
      ...prev,
      [selectedRoom]: prev[selectedRoom].map(task =>
        task.id === taskId ? { ...task, status, notes } : task
      )
    }))
  }

  const handleAddRoom = () => {
    if (newRoomName.trim() && !rooms.includes(newRoomName.trim())) {
      const trimmedName = newRoomName.trim()
      setRooms([...rooms, trimmedName].sort())
      setSelectedRoom(trimmedName)
      setNewRoomName('')
      setAddingRoom(false)
      setMessage(`Room "${trimmedName}" added!`)
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleSubmitTasks = async () => {
    const roomTasks = tasks[selectedRoom] || []

    // Validate: notes required for "not_done" status
    for (const task of roomTasks) {
      if (task.status === 'not_done' && !task.notes?.trim()) {
        setMessage('Notes are required for tasks marked "Carry Over"')
        return
      }
    }

    setSubmitting(true)

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

      await fetchTasks()

      // Fetch task entries to restore status
      const today = new Date().toISOString().split('T')[0]
      const entriesRes = await fetch(`${apiUrl}/task-entries?shift_id=${selectedShift}&facility_id=1&date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const entriesData = await entriesRes.json()
      console.log('Entries response:', entriesData)
      const { entries } = entriesData

      // Map entries by task_id for quick lookup
      const statusMap = {}
      entries.forEach(e => { statusMap[e.task_id] = e })
      console.log('Status map:', statusMap)

      // Restore status from entries (keep all tasks including YES)
      setTasks(prev => ({
        ...prev,
        [selectedRoom]: (prev[selectedRoom] || []).map(task => ({
          ...task,
          status: statusMap[task.id]?.status,
          notes: statusMap[task.id]?.notes
        }))
      }))
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
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Shift</label>
          <select
            value={selectedShift}
            onChange={(e) => lockedShift ? null : setSelectedShift(parseInt(e.target.value))}
            disabled={!!lockedShift}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shifts.map(shift => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.time})
              </option>
            ))}
          </select>
          {lockedShift && <p className="text-xs text-gray-400 mt-2">Your shift is locked to your login selection</p>}
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded ${message.includes('success') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {message}
          </div>
        )}

        {/* Room Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Room/Area</label>
          {addingRoom ? (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRoom()}
                placeholder="Enter new room name..."
                autoFocus
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-teal-400 focus:outline-none"
              />
              <button
                onClick={handleAddRoom}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded transition"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingRoom(false)
                  setNewRoomName('')
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <select
            value={selectedRoom || ''}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                setAddingRoom(true)
              } else {
                setSelectedRoom(e.target.value)
              }
            }}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
          >
            <option value="">Choose a room...</option>
            {rooms.map(room => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
            <option value="__add_new__" className="bg-teal-600">+ Add New Room</option>
          </select>
        </div>

        <div>
          {/* Tasks */}
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

        {/* Notes Section */}
        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-xl font-bold text-teal-400 mb-4">Notes</h3>

          {/* Add Note */}
          <div className="mb-6">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              rows="2"
            />
            <button
              onClick={handleAddNote}
              className="mt-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded transition"
            >
              Submit Note
            </button>
          </div>

          {/* Notes List (newest at bottom) */}
          <div className="space-y-2">
            {notes.map(note => (
              <div
                key={note.id}
                className="bg-gray-800 rounded p-3 border border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <button
                      onClick={() => setExpandedNotes(prev => ({
                        ...prev,
                        [note.id]: !prev[note.id]
                      }))}
                      className="text-teal-400 font-bold text-sm hover:underline"
                    >
                      {expandedNotes[note.id] ? '▼' : '▶'} {note.staff_name} - {new Date(note.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}
                    </button>
                  </div>
                  {currentStaff?.email === 'amb@grscorp.us' && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="ml-2 text-red-400 hover:text-red-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {expandedNotes[note.id] && (
                  <p className="text-gray-300 text-sm mt-2 ml-4 whitespace-pre-wrap">{note.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Supplies Section */}
        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-xl font-bold text-teal-400 mb-4">Supplies</h3>

          {/* Add Supply */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={newSupplyName}
                onChange={(e) => setNewSupplyName(e.target.value)}
                placeholder="Supply name"
                className="col-span-2 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
              />
              <input
                type="number"
                value={newSupplyQty}
                onChange={(e) => setNewSupplyQty(e.target.value)}
                placeholder="Qty"
                className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-400 focus:outline-none"
                min="1"
              />
            </div>
            <button
              onClick={handleAddSupply}
              className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded transition"
            >
              Submit Supply
            </button>
          </div>

          {/* Supplies List (newest at top) - reverse sort */}
          <div className="space-y-2">
            {[...supplies].reverse().map(supply => (
              <div
                key={supply.id}
                className="bg-gray-800 rounded p-3 border border-gray-700 flex justify-between items-center"
              >
                <div className="text-sm">
                  <p className="text-white font-bold">{supply.supply_name}</p>
                  <p className="text-gray-400 text-xs">{supply.staff_name} - {new Date(supply.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-teal-400 font-bold text-lg">{supply.quantity}</span>
                  {currentStaff?.email === 'amb@grscorp.us' && (
                    <button
                      onClick={() => handleDeleteSupply(supply.id)}
                      className="text-red-400 hover:text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
