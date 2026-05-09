import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, verifyEmailOtp, resendOtp } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('details') // details | otp

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('member')

  const [otp, setOtp] = useState('')

  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitDetails(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    try {
      const data = await register({ name, email, password, role })
      setStep('otp')
      if (data?.devOtp) {
        setInfo('OTP is being printed in your server console (SMTP not configured).')
      } else if (data?.otpDelivered) {
        setInfo('OTP sent to your email. Please enter it below.')
      } else {
        setInfo('OTP could not be delivered (check SMTP). For dev, it may be printed in server logs.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await verifyEmailOtp(email, otp)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'OTP verification failed')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const data = await resendOtp(email)
      if (data?.devOtp) setInfo('OTP re-sent (printed in server console in dev).')
      else setInfo('OTP re-sent to your email.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="authShell">
        <div className="card authCard">
          <h1>Create your account</h1>
          <p className="muted">Verify your email with a one-time code (OTP).</p>

          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="info">{info}</p> : null}

          {step === 'details' ? (
            <form onSubmit={submitDetails} className="form">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </label>
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                showMeter
                showRules
              />

              <PasswordField
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                showMeter={false}
                showRules={false}
              />
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="btn btn--primary" disabled={busy} type="submit">
                {busy ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="form">
              <div className="rowBetween">
                <h2>Email verification</h2>
                <button type="button" className="btn btn--ghost" onClick={() => setStep('details')}>
                  Edit details
                </button>
              </div>
              <p className="muted">We sent a code to <strong>{email}</strong>.</p>
              <label>
                OTP
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  required
                />
              </label>
              <button className="btn btn--primary" disabled={busy} type="submit">
                {busy ? 'Verifying...' : 'Verify & Sign in'}
              </button>
              <button className="btn btn--ghost" disabled={busy} type="button" onClick={resend}>
                Resend OTP
              </button>
            </form>
          )}

          <p className="muted mt">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
