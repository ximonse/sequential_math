import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PracticeSession from './components/student/PracticeSession'
import SubitizingSession from './components/student/SubitizingSession'
import StudentHome from './components/student/StudentHome'
import StudentTicket from './components/student/StudentTicket'
import Dashboard from './components/teacher/Dashboard'
import TeacherLogin from './components/teacher/TeacherLogin'
import TeacherAdminPage from './components/teacher/TeacherAdminPage'
import Login from './components/Login'
import ThemeSwitcher from './components/shared/ThemeSwitcher'
import AdaptiveQaBootstrap from './dev/AdaptiveQaBootstrap'
import { isTeacherAuthenticated } from './lib/teacherAuth'
import { initCloudSyncListeners, destroyCloudSyncListeners } from './lib/storage'

const diagnosticQaEnabled = import.meta.env.DEV || import.meta.env.MODE === 'diagnostic-qa'
const DiagnosticGridPrototype = diagnosticQaEnabled
  ? lazy(() => import('./dev/DiagnosticGridPrototype'))
  : null

function RequireTeacherAuth({ children }) {
  if (!isTeacherAuthenticated()) {
    return <Navigate to="/teacher-login" replace />
  }

  return children
}

function App() {
  useEffect(() => {
    initCloudSyncListeners()
    return () => destroyCloudSyncListeners()
  }, [])

  return (
    <div className="min-h-screen theme-app-shell">
      <div className="flex justify-end px-3 pt-3">
        <ThemeSwitcher />
      </div>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/:studentId" element={<StudentHome />} />
        <Route path="/student/:studentId/practice" element={<PracticeSession />} />
        <Route path="/student/:studentId/subitizing" element={<SubitizingSession />} />
        <Route path="/student/:studentId/ticket" element={<StudentTicket />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        {import.meta.env.DEV ? <Route path="/qa/adaptive" element={<AdaptiveQaBootstrap />} /> : null}
        {diagnosticQaEnabled ? (
          <Route path="/qa/diagnostic-grid" element={<Suspense fallback={<p>Öppnar räknehäftet...</p>}><DiagnosticGridPrototype /></Suspense>} />
        ) : null}
        <Route
          path="/teacher"
          element={(
            <RequireTeacherAuth>
              <Dashboard />
            </RequireTeacherAuth>
          )}
        />
        <Route
          path="/teacher/admin"
          element={(
            <RequireTeacherAuth>
              <TeacherAdminPage />
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
