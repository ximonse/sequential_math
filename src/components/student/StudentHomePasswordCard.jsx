export default function StudentHomePasswordCard({
  currentPassword,
  newPassword,
  passwordMessage,
  onSetCurrentPassword,
  onSetNewPassword,
  onSubmit
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Byt elevlösenord</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => onSetCurrentPassword(event.target.value)}
          placeholder="Nuvarande"
          className="px-3 py-2 border rounded text-sm"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => onSetNewPassword(event.target.value)}
          placeholder="Nytt lösenord"
          className="px-3 py-2 border rounded text-sm"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Spara
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">{passwordMessage || ' '}</p>
    </div>
  )
}
