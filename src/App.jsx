import { Routes, Route, Navigate } from 'react-router-dom'
import StudentSession from './components/student/StudentSession'
import Dashboard from './components/teacher/Dashboard'
import TeacherLogin from './components/teacher/TeacherLogin'
import Login from './components/Login'
import { isTeacherAuthenticated } from './lib/teacherAuth'

function RequireTeacherAuth({ children }) {
  if (!isTeacherAuthenticated()) {
    return <Navigate to="/teacher-login" replace />
  }

  return children
}

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/:studentId" element={<StudentSession />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route
          path="/teacher"
          element={(
            <RequireTeacherAuth>
              <Dashboard />
            </RequireTeacherAuth>
          )}
        />
      </Routes>
    </div>
  )
}

export default App
