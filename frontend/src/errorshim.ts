// Error shim for the AI Engineering OS error tracker.
// Reports uncaught errors and unhandled promise rejections. Never throws,
// non-blocking, zero-dependency.
// ponytail: URL/key pinned to the local tracker install; move to env wiring
// when the API leaves localhost.
const CAPTURE_URL = 'http://localhost:4000/api/projects/204c25bc-44d0-4595-9c9f-c14a7934b4ce/errors/capture'
const INGEST_KEY = 'fa38d573-b710-4da5-85c3-99424e302d68'

function report(message: string, stack = '', context: Record<string, unknown> = {}) {
  void fetch(CAPTURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Ingest-Key': INGEST_KEY },
    body: JSON.stringify({ message, stack, context, severity: 'medium', source: 'agent' }),
  }).catch(() => {})
}

export function initErrorShim() {
  window.addEventListener('error', (e) => {
    report(e.message, e.error?.stack ?? '', { type: 'window-error', source: e.filename, line: e.lineno })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason
    report(err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack : '', { type: 'unhandledrejection' })
  })
}