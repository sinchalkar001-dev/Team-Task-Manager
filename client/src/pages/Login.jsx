import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="authShell">
        <div className="card authCard">
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your projects and tasks.</p>

          {error ? (
            <p className="error">
              {error}
              {error === 'Email not verified' ? (
                <>
                  {' '}
                  Please go to <Link to="/register">Register</Link> and verify with OTP.
                </>
              ) : null}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="form">
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              showMeter={false}
              showRules={false}
            />
            <button className="btn btn--primary" disabled={busy} type="submit">
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="muted mt">
            No account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
