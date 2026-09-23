export function constrainClassPracticeRules(rules, allowedOperations, requestedFreeOps = [], selectedFreeOps = []) {
  if (allowedOperations === null) return { status: 'loading' }
  if (!Array.isArray(allowedOperations) || allowedOperations.length === 0) {
    return { status: 'unavailable' }
  }
  if (requestedFreeOps.length > 0 && selectedFreeOps.length === 0) {
    return { status: 'disallowed_link' }
  }

  const requested = [
    ...(Array.isArray(rules.allowedTypes) ? rules.allowedTypes : []),
    rules.forcedType
  ].filter(Boolean)
  if (requested.some(operation => !allowedOperations.includes(operation))) {
    return { status: 'disallowed_operation' }
  }

  return {
    status: 'ready',
    rules: !rules.allowedTypes && !rules.forcedType
      ? { ...rules, allowedTypes: allowedOperations }
      : rules
  }
}
