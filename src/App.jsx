import { Fragment, lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import PracticeSession from './components/student/PracticeSession'
import SubitizingSession from './components/student/SubitizingSession'
import StudentHome from './components/student/StudentHome'
import StudentTicket from './components/student/StudentTicket'
import Dashboard from './components/teacher/Dashboard'
import TeacherLogin from './components/teacher/TeacherLogin'
import Login from './components/Login'
import ThemeSwitcher from './components/shared/ThemeSwitcher'
import AdaptiveQaBootstrap from './dev/AdaptiveQaBootstrap'
import { isTeacherAdmin, isTeacherAuthenticated } from './lib/teacherAuth'
import { initCloudSyncListeners, destroyCloudSyncListeners } from './lib/storage'

const DiagnosticGridPrototype = lazy(() => import('./dev/DiagnosticGridPrototype'))
const StudentDiagnosticAttempt = lazy(() => import('./components/student/StudentDiagnosticAttempt'))
const MaterialReview = lazy(() => import('./components/teacher/MaterialReview'))

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

// "Nästa uppdrag" changes only the query string; a new assignment must start a
// fresh session instead of inheriting the finished one's counters and overlays.
function ByAssignment({ children }) {
  const [searchParams] = useSearchParams()
  return <Fragment key={searchParams.get('assignment') || ''}>{children}</Fragment>
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
        <Route path="/student/:studentId/practice" element={<ByAssignment><PracticeSession /></ByAssignment>} />
        <Route path="/student/:studentId/subitizing" element={<ByAssignment><SubitizingSession /></ByAssignment>} />
        <Route path="/student/:studentId/ticket" element={<StudentTicket />} />
        <Route path="/student/:studentId/diagnostic" element={<Suspense fallback={<p>Öppnar räknehäftet...</p>}><StudentDiagnosticAttempt /></Suspense>} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        {import.meta.env.DEV ? <Route path="/qa/adaptive" element={<AdaptiveQaBootstrap />} /> : null}
        <Route path="/teacher/ncm/diagnostic-grid" element={diagnosticGridRoute} />
        <Route path="/teacher/material/:draftId" element={<RequireTeacherAuth><Suspense fallback={<p>Öppnar materialutkast…</p>}><MaterialReview /></Suspense></RequireTeacherAuth>} />
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
          path="/teacher/focus"
          element={<RequireTeacherAuth><Dashboard /></RequireTeacherAuth>}
        />
        <Route
          path="/teacher/admin"
          element={(
            // Administration is a tab in the teacher view; keep old links working.
            <Navigate to="/teacher" replace state={{ workspace: 'admin' }} />
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
