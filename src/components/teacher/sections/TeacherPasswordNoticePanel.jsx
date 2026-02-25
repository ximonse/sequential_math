export default function TeacherPasswordNoticePanel() {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Lärarlösenord</h2>
      <p className="text-sm text-gray-500 mb-3">
        Hanteras server-side via `TEACHER_API_PASSWORD` i Vercel.
        Ändra lösenord i projektets Environment Variables och redeploya.
      </p>
      <p className="text-xs text-gray-400">
        Säkerhetsnotis: inget lärarlösenord lagras längre i frontend (`VITE_*`).
      </p>
    </div>
  )
}
