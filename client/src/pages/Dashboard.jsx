import { useEffect, useState } from 'react'
import api from '../api/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setError('')
      try {
        const res = await api.get('/dashboard')
        if (!ignore) setData(res.data)
      } catch (err) {
        if (!ignore) setError(err?.response?.data?.message || 'Failed to load dashboard')
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="container">
      <div className="card">
        <h1>Dashboard</h1>
        {error ? <p className="error">{error}</p> : null}
        {!data ? (
          <p className="muted">Loading...</p>
        ) : (
          <>
            <div className="grid3">
              <div className="stat">
                <div className="stat__label">Todo</div>
                <div className="stat__value">{data.counts.todo}</div>
              </div>
              <div className="stat">
                <div className="stat__label">In progress</div>
                <div className="stat__value">{data.counts.in_progress}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Done</div>
                <div className="stat__value">{data.counts.done}</div>
              </div>
            </div>

            <h2 className="mt">Overdue</h2>
            {data.overdue.length === 0 ? (
              <p className="muted">No overdue tasks</p>
            ) : (
              <ul className="list">
                {data.overdue.map((t) => (
                  <li key={t._id} className="list__item">
                    <div>
                      <strong>{t.title}</strong>
                      <div className="muted">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</div>
                    </div>
                    <span className="chip">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
