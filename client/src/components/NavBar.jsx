import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="brand" to={user ? '/' : '/login'}>
          Team Task Manager
        </Link>

        <nav className="nav">
          {user ? (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/projects">Projects</Link>
              <span className="chip">{user.role}</span>
              <span className="chip">{user.name}</span>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
