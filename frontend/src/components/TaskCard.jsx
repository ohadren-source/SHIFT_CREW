import { useState, useEffect } from 'react'

export default function TaskCard({ task, onChange }) {
  const [notes, setNotes] = useState(task.notes || '')
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    setNotes(task.notes || '')
  }, [task.notes])

  const handleStatusChange = (status) => {
    onChange(task.id, status, notes)
    if (status !== 'not_done') {
      setShowNotes(false)
      setNotes('')
    } else {
      setShowNotes(true)
    }
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 transition ${
      task.is_carry_over ? 'border-l-red-600 bg-red-900 bg-opacity-40' :
      task.is_critical ? 'border-l-red-500 bg-red-900 bg-opacity-20' : 'border-l-gray-600 bg-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-white">{task.task_name}</h3>
            {task.is_carry_over && <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-bold">CARRY-OVER</span>}
            {task.is_critical && <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-bold">CRITICAL</span>}
            {task.is_persistent && <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded font-bold">DAILY</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange('yes')}
            className={`px-4 py-2 rounded font-bold transition ${
              task.status === 'yes'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-green-700'
            }`}
          >
            ✓ Yes
          </button>
          <button
            onClick={() => handleStatusChange('no')}
            style={{
              backgroundColor: task.status === 'no' ? '#dc2626' : '#374151',
              color: task.status === 'no' ? 'white' : '#d1d5db'
            }}
            className="px-4 py-2 rounded font-bold transition hover:bg-red-700"
          >
            ✕ No
          </button>
          <button
            onClick={() => handleStatusChange('not_done')}
            className={`px-4 py-2 rounded font-bold transition ${
              task.status === 'not_done'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-yellow-600'
            }`}
          >
            → Carry Over
          </button>
        </div>
      </div>

      {task.status === 'not_done' && (
        <div className="mt-3">
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              onChange(task.id, 'not_done', e.target.value)
            }}
            placeholder="Why wasn't this completed? (required)"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-orange-400 focus:outline-none text-sm"
            rows="2"
            required
          />
        </div>
      )}
    </div>
  )
}
