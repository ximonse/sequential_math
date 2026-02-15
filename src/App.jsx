import { Routes, Route, Navigate } from 'react-router-dom'
import StudentSession from './components/student/StudentSession'
import StudentHome from './components/student/StudentHome'
import StudentTicket from './components/student/StudentTicket'
import Dashboard from './components/teacher/Dashboard'
import TeacherLogin from './components/teacher/TeacherLogin'
import Login from './components/Login'
import ThemeSwitcher from './components/shared/ThemeSwitcher'
import { isTeacherAuthenticated } from './lib/teacherAuth'

function RequireTeacherAuth({ children }) {
  if (!isTeacherAuthenticated()) {
    return <Navigate to="/teacher-login" replace />
  }

  return children
}

function App() {
  return (
    <div className="min-h-screen theme-app-shell">
      <ThemeSwitcher />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/:studentId" element={<StudentHome />} />
        <Route path="/student/:studentId/practice" element={<StudentSession />} />
        <Route path="/student/:studentId/ticket" element={<StudentTicket />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route
          path="/teacher"
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
