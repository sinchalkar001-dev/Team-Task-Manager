import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function Projects() {
  const { user } = useAuth()

  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await api.get('/projects')
    setProjects(res.data.projects)
  }

  useEffect(() => {
    load().catch((err) => setError(err?.response?.data?.message || 'Failed to load projects'))
  }, [])

  async function createProject(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/projects', { name, description })
      setName('')
      setDescription('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create project')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Projects</h1>
        {error ? <p className="error">{error}</p> : null}

        {user.role === 'admin' ? (
          <form onSubmit={createProject} className="form">
            <h2>Create project</h2>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <button className="btn" disabled={busy} type="submit">
              {busy ? 'Creating...' : 'Create'}
            </button>
          </form>
        ) : (
          <p className="muted">(Member accounts can view projects they belong to.)</p>
        )}

        <h2 className="mt">Your projects</h2>
        {projects.length === 0 ? (
          <p className="muted">No projects yet</p>
        ) : (
          <ul className="list">
            {projects.map((p) => (
              <li key={p._id} className="list__item">
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted">{p.description}</div>
                </div>
                <Link className="btn btn--ghost" to={`/projects/${p._id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
