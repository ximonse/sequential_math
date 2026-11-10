// Unexpected storage or script errors were hidden behind a generic 503 and never
// logged. Log the error itself (name, message, code; no request body or pupil
// data) so the cause shows in the Vercel runtime logs.
export function logUnexpectedDiagnosticError(route, req, error, details = {}) {
  if (error?.status) return
  const message = String(error?.message || error || '').slice(0, 500)
  console.error(`[${route}] unexpected error`, JSON.stringify({ method: req?.method, name: error?.name, code: error?.code,
    message, ...details }))
}

export const UNEXPECTED_DIAGNOSTIC_ERROR = 'Screeningen kunde inte sparas eller läsas på grund av ett tekniskt fel. Försök igen; felet är loggat.'
