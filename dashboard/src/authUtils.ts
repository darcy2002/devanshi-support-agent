export const TOKEN_KEY = 'devanshi_dashboard_token'

export function getAuthHeaders(): HeadersInit {
  const t = localStorage.getItem(TOKEN_KEY)
  return t ? { Authorization: `Bearer ${t}` } : {}
}
