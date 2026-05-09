import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')

  const [memberEmail, setMemberEmail] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssigneeEmail, setTaskAssigneeEmail] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  const [submitFiles, setSubmitFiles] = useState({})
  const [submitNotes, setSubmitNotes] = useState({})
  const [submittingTaskId, setSubmittingTaskId] = useState('')

  const isOwnerAdmin = useMemo(() => {
    return user?.role === 'admin' && project && String(project.owner) === String(user.id)
  }, [user, project])

  async function load() {
    const [pRes, tRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks/project/${id}`),
    ])
    setProject(pRes.data.project)
    setTasks(tRes.data.tasks)
  }

  useEffect(() => {
    load().catch((err) => setError(err?.response?.data?.message || 'Failed to load project'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addMember(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail })
      setMemberEmail('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add member')
    }
  }

  async function createTask(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/tasks/project/${id}`, {
        title: taskTitle,
        description: taskDesc,
        assigneeEmail: taskAssigneeEmail || undefined,
        dueDate: taskDueDate || undefined,
      })
      setTaskTitle('')
      setTaskDesc('')
      setTaskAssigneeEmail('')
      setTaskDueDate('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create task')
    }
  }

  async function updateStatus(taskId, status) {
    setError('')
    try {
      const res = await api.patch(`/tasks/${taskId}`, { status })
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.task : t)))
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update task')
    }
  }

  async function submitTaskWork(taskId) {
    setError('')
    const file = submitFiles[taskId]
    if (!file) {
      setError('Please choose a file to submit')
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    if (submitNotes[taskId]) fd.append('note', submitNotes[taskId])

    try {
      setSubmittingTaskId(taskId)
      const res = await api.post(`/tasks/${taskId}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.task : t)))
      setSubmitFiles((prev) => ({ ...prev, [taskId]: null }))
      setSubmitNotes((prev) => ({ ...prev, [taskId]: '' }))
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit task')
    } finally {
      setSubmittingTaskId('')
    }
  }

  async function downloadSubmission(taskId, fallbackName) {
    setError('')
    try {
      const res = await api.get(`/tasks/${taskId}/submission`, { responseType: 'blob' })
      const cd = res.headers?.['content-disposition'] || ''
      const match = cd.match(/filename="?([^";]+)"?/i)
      const fileName = match?.[1]
        ? decodeURIComponent(match[1])
        : (fallbackName || `submission-${taskId}`)

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to download submission')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Project</h1>
        {error ? <p className="error">{error}</p> : null}

        {!project ? (
          <p className="muted">Loading...</p>
        ) : (
          <>
            <div className="panel">
              <div>
                <div className="muted">Name</div>
                <strong>{project.name}</strong>
              </div>
              <div>
                <div className="muted">Owner</div>
                <code>{project.owner}</code>
              </div>
              <div>
                <div className="muted">Members</div>
                <code>{project.members?.length || 0}</code>
              </div>
            </div>

            {isOwnerAdmin ? (
              <form className="form mt" onSubmit={addMember}>
                <h2>Add member (by email)</h2>
                <label>
                  Member email
                  <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} type="email" required />
                </label>
                <button className="btn btn--ghost" type="submit">
                  Add member
                </button>
              </form>
            ) : null}

            {isOwnerAdmin ? (
              <form className="form mt" onSubmit={createTask}>
                <h2>Create task</h2>
                <label>
                  Title
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
                </label>
                <label>
                  Description
                  <input value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
                </label>
                <label>
                  Assignee email (must be member)
                  <input value={taskAssigneeEmail} onChange={(e) => setTaskAssigneeEmail(e.target.value)} type="email" />
                </label>
                <label>
                  Due date
                  <input value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} type="date" />
                </label>
                <button className="btn" type="submit">
                  Create task
                </button>
              </form>
            ) : (
              <p className="muted mt">Only the project owner (Admin) can create tasks.</p>
            )}

            <h2 className="mt">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="muted">No tasks yet</p>
            ) : (
              <ul className="list">
                {tasks.map((t) => {
                  const isAssignee = t.assignee && String(t.assignee) === String(user.id)
                  const canMemberSubmit = user?.role === 'member' && isAssignee
                  const hasSubmission = Boolean(t.submission?.fileName)

                  return (
                    <li key={t._id} className="list__item">
                      <div>
                        <strong>{t.title}</strong>
                        <div className="muted">
                          Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                        </div>
                        <div className="muted">Assignee: {t.assignee || '-'}</div>
                        {t.completedAt ? (
                          <div className="muted">Completed: {new Date(t.completedAt).toLocaleString()}</div>
                        ) : null}
                      </div>

                      <div className="taskActions">
                        {isOwnerAdmin ? (
                          <>
                            <select value={t.status} onChange={(e) => updateStatus(t._id, e.target.value)}>
                              <option value="todo">todo</option>
                              <option value="in_progress">in_progress</option>
                              <option value="done">done</option>
                            </select>

                            {hasSubmission ? (
                              <div className="taskSubmit">
                                <span className="chip chip--success">submitted</span>
                                <button
                                  className="btn btn--ghost"
                                  type="button"
                                  onClick={() => downloadSubmission(t._id, t.submission?.originalName || t.submission?.fileName)}
                                >
                                  Download submission
                                </button>
                                <div className="muted">
                                  File: {t.submission?.originalName || t.submission?.fileName}
                                  {t.submission?.size ? ` (${Math.round(t.submission.size / 1024)} KB)` : ''}
                                </div>
                                {t.submission?.note ? <div className="muted">Note: {t.submission.note}</div> : null}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {hasSubmission ? (
                              <div className="taskSubmit">
                                <span className="chip chip--success">done</span>
                                <button
                                  className="btn btn--ghost"
                                  type="button"
                                  onClick={() => downloadSubmission(t._id, t.submission?.originalName || t.submission?.fileName)}
                                >
                                  Download submission
                                </button>
                                {t.submission?.note ? <div className="muted">Note: {t.submission.note}</div> : null}
                              </div>
                            ) : canMemberSubmit ? (
                              <div className="taskSubmit">
                                <span className="chip">{t.status}</span>
                                <input
                                  className="taskFile"
                                  type="file"
                                  accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.txt"
                                  onChange={(e) =>
                                    setSubmitFiles((prev) => ({ ...prev, [t._id]: e.target.files?.[0] || null }))
                                  }
                                />
                                <input
                                  className="taskNote"
                                  placeholder="Optional note for the admin"
                                  value={submitNotes[t._id] || ''}
                                  onChange={(e) =>
                                    setSubmitNotes((prev) => ({ ...prev, [t._id]: e.target.value }))
                                  }
                                />
                                <button
                                  className="btn btn--primary"
                                  type="button"
                                  disabled={submittingTaskId === t._id}
                                  onClick={() => submitTaskWork(t._id)}
                                >
                                  {submittingTaskId === t._id ? 'Submitting…' : 'Submit task'}
                                </button>
                              </div>
                            ) : (
                              <span className="chip">{t.status}</span>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
