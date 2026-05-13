import { useState, useEffect } from 'react'

export default function DailyDashboard({ token, apiUrl, facilityId = 1 }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [date])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/dashboard/daily?facility_id=${facilityId}&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setData(data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    }
    setLoading(false)
  }

  if (loading) return <div className="text-gray-400">Loading...</div>
  if (!data) return <div className="text-gray-400">No data</div>

  const totalTasks = data.facility_totals?.total || 0
  const completed = data.facility_totals?.completed || 0
  const missed = data.facility_totals?.missed || 0
  const notDone = data.facility_totals?.not_done || 0
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-teal-400">Daily Dashboard</h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Completion Rate</p>
            <p className="text-3xl font-bold text-teal-400">{completionRate}%</p>
          </div>
          <div className="bg-green-900 bg-opacity-30 rounded-lg p-4 border border-green-600">
            <p className="text-gray-400 text-sm">Completed</p>
            <p className="text-3xl font-bold text-green-400">{completed}</p>
          </div>
          <div className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-600">
            <p className="text-gray-400 text-sm">Missed</p>
            <p className="text-3xl font-bold text-red-400">{missed}</p>
          </div>
          <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4 border border-yellow-600">
            <p className="text-gray-400 text-sm">Not Done</p>
            <p className="text-3xl font-bold text-yellow-400">{notDone}</p>
          </div>
        </div>

        {/* Shifts breakdown */}
        <div className="space-y-6">
          {data.shifts?.map(shift => (
            <div key={shift.shift_id} className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{shift.shift_name}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shift.staff_on_duty?.map(staff => (
                  <div key={staff.staff_id} className="bg-gray-700 rounded p-4">
                    <p className="font-bold text-white">{staff.name}</p>
                    <p className="text-gray-400 text-sm">{staff.role}</p>

                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-gray-300">
                        Tasks: <span className="text-teal-400 font-bold">{staff.tasks_completed}/{staff.tasks_total}</span>
                      </p>
                      <p className="text-gray-300">
                        Rate: <span className="text-teal-400 font-bold">{Math.round(staff.completion_pct)}%</span>
                      </p>
                      {staff.last_completion_time && (
                        <p className="text-gray-300">
                          Completed: <span className="text-green-400 font-bold">{new Date(staff.last_completion_time).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span> EST
                        </p>
                      )}
                      {staff.critical_missed > 0 && (
                        <p className="text-red-400">
                          ⚠️ Critical Missed: {staff.critical_missed}
                        </p>
                      )}
                      {staff.carry_over_count > 0 && (
                        <p className="text-yellow-400">
                          📋 Carry-over: {staff.carry_over_count}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
