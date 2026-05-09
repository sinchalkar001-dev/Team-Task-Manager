import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { setAuthToken } from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  useEffect(() => {
    async function boot() {
      try {
        if (!token) {
          setUser(null)
          setLoading(false)
          return
        }
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  // Registration now triggers OTP verification first (no JWT yet)
  async function register({ name, email, password, role }) {
    const { data } = await api.post('/auth/register', { name, email, password, role })
    return data
  }

  async function verifyEmailOtp(email, otp) {
    const { data } = await api.post('/auth/verify-email', { email, otp })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function resendOtp(email) {
    const { data } = await api.post('/auth/resend-otp', { email })
    return data
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setAuthToken(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, verifyEmailOtp, resendOtp, logout }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
