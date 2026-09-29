export function credentialText(credentials) {
  return credentials.map(({ name, displayAlias, studentId, pin }) => (
    `${String(name || '').trim() || displayAlias || 'Elev'}\nKodnamn: ${displayAlias || '–'}\nPIN: ${pin}\nElev-ID: ${studentId}`
  )).join('\n\n')
}
