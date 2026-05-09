import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
