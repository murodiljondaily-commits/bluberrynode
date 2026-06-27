import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Lesson from './pages/Lesson'
import Vocabulary from './pages/Vocabulary'
import Garden from './pages/Garden'
import Lessons from './pages/Lessons'
import Roadmap from './pages/Roadmap'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'

function ProtectedRoute({ session, children }) {
  if (session === undefined) return null
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute session={session}>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lesson/:subject/:week"
          element={
            <ProtectedRoute session={session}>
              <Lesson />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vocabulary"
          element={
            <ProtectedRoute session={session}>
              <Vocabulary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/garden"
          element={
            <ProtectedRoute session={session}>
              <Garden />
            </ProtectedRoute>
          }
        />
        <Route path="/lessons" element={<ProtectedRoute session={session}><Lessons /></ProtectedRoute>} />
        <Route path="/lessons/:subject" element={<ProtectedRoute session={session}><Lessons /></ProtectedRoute>} />
        <Route path="/roadmap" element={<ProtectedRoute session={session}><Roadmap /></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute session={session}><Statistics /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute session={session}><Settings /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
