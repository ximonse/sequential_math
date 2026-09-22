export function isSchoolCreationDisabled({ busy, name }) {
  return Boolean(busy || !String(name || '').trim())
}
