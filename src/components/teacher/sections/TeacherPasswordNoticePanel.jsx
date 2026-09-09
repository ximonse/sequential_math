export default function TeacherPasswordNoticePanel() {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Lärarkonton</h2>
      <p className="text-sm text-gray-500 mb-3">
        Lösenord och behörigheter hanteras i lärarkonton under Admin. Ändringar
        spärrar äldre sessioner direkt.
      </p>
      <p className="text-xs text-gray-400">
        Säkerhetsnotis: inget lärarlösenord lagras i frontend.
      </p>
    </div>
  )
}
