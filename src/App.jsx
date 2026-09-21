import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import PracticeSession from './components/student/PracticeSession'
import StudentHome from './components/student/StudentHome'
import StudentTicket from './components/student/StudentTicket'
import Dashboard from './components/teacher/Dashboard'
import TeacherLogin from './components/teacher/TeacherLogin'
import Login from './components/Login'
import ThemeSwitcher from './components/shared/ThemeSwitcher'
import AdaptiveQaBootstrap from './dev/AdaptiveQaBootstrap'
import { isTeacherAuthenticated } from './lib/teacherAuth'
import { initCloudSyncListeners, destroyCloudSyncListeners } from './lib/storage'

function RequireTeacherAuth({ children }) {
  if (!isTeacherAuthenticated()) {
    return <Navigate to="/teacher-login" replace />
  }

  return children
}

function App() {
  const location = useLocation()
  const isTeacherRoute = location.pathname.startsWith('/teacher')

  useEffect(() => {
    initCloudSyncListeners()
    return () => destroyCloudSyncListeners()
  }, [])

  return (
    <div className="min-h-screen theme-app-shell">
      {!isTeacherRoute ? (
        <div className="flex justify-end px-3 pt-3">
          <ThemeSwitcher />
        </div>
      ) : null}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/:studentId" element={<StudentHome />} />
        <Route path="/student/:studentId/practice" element={<PracticeSession />} />
        <Route path="/student/:studentId/ticket" element={<StudentTicket />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        {import.meta.env.DEV ? <Route path="/qa/adaptive" element={<AdaptiveQaBootstrap />} /> : null}
        <Route
          path="/teacher"
          element={(
            <RequireTeacherAuth>
              <Dashboard />
            </RequireTeacherAuth>
          )}
        />
        <Route
          path="/teacher/student"
          element={(
            <RequireTeacherAuth>
              <Dashboard />
            </RequireTeacherAuth>
          )}
        />
        <Route
          path="/teacher/student/:studentId"
          element={(
            <RequireTeacherAuth>
              <Dashboard />
            </RequireTeacherAuth>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
