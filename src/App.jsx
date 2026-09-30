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
import { isTeacherAdmin, isTeacherAuthenticated } from './lib/teacherAuth'
import { initCloudSyncListeners, destroyCloudSyncListeners } from './lib/storage'

const DiagnosticGridPrototype = lazy(() => import('./dev/DiagnosticGridPrototype'))

function RequireTeacherAuth({ children }) {
  if (!isTeacherAuthenticated()) {
    return <Navigate to="/teacher-login" replace />
  }

  return children
}

function RequireNcmAdmin({ children }) {
  if (!isTeacherAuthenticated()) return <Navigate to="/teacher-login" replace />
  if (!isTeacherAdmin()) return <Navigate to="/teacher" replace />
  return children
}

const diagnosticGridRoute = <RequireNcmAdmin>
  <Suspense fallback={<p>Öppnar räknehäftet...</p>}><DiagnosticGridPrototype /></Suspense>
</RequireNcmAdmin>

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
        <Route path="/teacher/ncm/diagnostic-grid" element={diagnosticGridRoute} />
        {import.meta.env.DEV ? <Route path="/qa/diagnostic-grid" element={<Navigate to="/teacher/ncm/diagnostic-grid" replace />} /> : null}
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
