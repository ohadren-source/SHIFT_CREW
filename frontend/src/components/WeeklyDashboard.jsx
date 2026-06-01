import { useState, useEffect } from 'react'

export default function WeeklyDashboard({ token, apiUrl, facilityId = 1 }) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [weekOptions, setWeekOptions] = useState([])

  // Generate last 12 weeks of options
  useEffect(() => {
    const options = []
    const today = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (i * 7))
      const dateStr = date.toISOString().split('T')[0]

      // Get Monday of this week
      const dayOfWeek = date.getDay()
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(date.setDate(diff))
      const sundayDate = new Date(monday)
      sundayDate.setDate(sundayDate.getDate() + 6)

      const mondayStr = monday.toISOString().split('T')[0]
      const sundayStr = sundayDate.toISOString().split('T')[0]

      options.push({
        value: mondayStr,
        label: `${mondayStr} to ${sundayStr}`
      })
    }

    setWeekOptions(options)
    if (options.length > 0 && !selectedWeekStart) {
      setSelectedWeekStart(options[0].value)
    }
  }, [])

  // Fetch dashboard when week changes
  useEffect(() => {
    if (selectedWeekStart) {
      fetchWeeklyDashboard()
    }
  }, [selectedWeekStart])

  const fetchWeeklyDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/dashboard/weekly?facility_id=${facilityId}&week_start=${selectedWeekStart}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setData(data)
      }
    } catch (err) {
      console.error('Failed to fetch weekly dashboard:', err)
    }
    setLoading(false)
  }

  if (!data) return <div className="text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-teal-400">Weekly Dashboard</h1>
          <select
            value={selectedWeekStart}
            onChange={(e) => setSelectedWeekStart(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 cursor-pointer"
          >
            {weekOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8 text-gray-300">
          <p className="text-lg font-semibold">Week: {data.week}</p>
        </div>

        {/* By Staff */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-teal-400 mb-4">By Staff</h2>
          {data.by_staff.length === 0 ? (
            <p className="text-gray-400">No data</p>
          ) : (
            <div className="space-y-3">
              {data.by_staff.map(staff => (
                <div key={staff.staff_id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-white">{staff.name}</p>
                      <p className="text-gray-400 text-sm">Staff ID: {staff.staff_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-400">{staff.avg_completion_pct}%</p>
                      <p className="text-gray-400 text-xs">Completion</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700 rounded p-2">
                      <p className="text-gray-400">Shifts Worked</p>
                      <p className="text-white font-bold">{staff.shifts_worked}</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2">
                      <p className="text-gray-400">Critical Missed</p>
                      <p className={`font-bold ${staff.critical_missed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {staff.critical_missed}
                      </p>
                    </div>
                    <div className="bg-gray-700 rounded p-2">
                      <p className="text-gray-400">Notes Written</p>
                      <p className="text-white font-bold">{staff.notes_written}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Role */}
        <div>
          <h2 className="text-2xl font-bold text-teal-400 mb-4">By Role</h2>
          {data.by_role.length === 0 ? (
            <p className="text-gray-400">No data</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.by_role.map(role => (
                <div key={role.role} className="bg-gray-800 rounded-lg p-4">
                  <p className="font-bold text-white mb-3">{role.role}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completion Rate:</span>
                      <span className="text-teal-400 font-bold">{role.avg_completion_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Critical Missed:</span>
                      <span className={role.critical_missed > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                        {role.critical_missed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Staff Count:</span>
                      <span className="text-white font-bold">{role.staff_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
