import { handleHealth } from '../api/_lib/http.ts'

/** Says only whether the server is configured. It never names a missing variable or shows a value. */
export function GET(): Response {
  return handleHealth(process.env)
}
