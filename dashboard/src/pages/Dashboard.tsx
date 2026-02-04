import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { getAuthHeaders } from '../authUtils'
import './Dashboard.css'

type AgentSummary = {
  agent_id?: string
  name?: string
  last_call_time_unix_secs?: number | null
  created_at_unix_secs?: number
  [key: string]: unknown
}

type Conversation = {
  conversation_id: string
  agent_id: string
  agent_name?: string
  start_time_unix_secs: number
  call_duration_secs: number
  message_count: number
  status?: string
  call_successful?: string
  transcript_summary?: string
  call_summary_title?: string
  direction?: string
  rating?: number
}

export function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<AgentSummary | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingCalls, setLoadingCalls] = useState(true)
  const [error, setError] = useState('')

  const handleUnauthorized = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const loadConversations = useCallback(() => {
    setLoadingCalls(true)
    const headers = getAuthHeaders()
    fetch('/api/conversations?page_size=50', { headers })
      .then((r) => {
        if (r.status === 401) {
          handleUnauthorized()
          return null
        }
        if (!r.ok) throw new Error('Failed to load conversations')
        return r.json()
      })
      .then((data: { conversations?: Conversation[]; has_more?: boolean; next_cursor?: string | null } | null) => {
        if (data == null) return
        setConversations(data.conversations ?? [])
        setHasMore(data.has_more ?? false)
        setNextCursor(data.next_cursor ?? null)
      })
      .catch((e) => setError((prev) => prev || e.message))
      .finally(() => setLoadingCalls(false))
  }, [handleUnauthorized])

  useEffect(() => {
    const headers = getAuthHeaders()
    fetch('/api/agent-summary', { headers })
      .then((r) => {
        if (r.status === 401) {
          handleUnauthorized()
          return null
        }
        if (!r.ok) throw new Error('Failed to load agent summary')
        return r.json()
      })
      .then((data) => {
        if (data != null) setSummary(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSummary(false))
  }, [handleUnauthorized])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Refresh call history only when support app reports activity (session start/end)
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = () => loadConversations()
    es.onerror = () => es.close()
    return () => es.close()
  }, [loadConversations])

  const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString()
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <h1 className="dashboard-title">Devanshi Dashboard</h1>
          <div className="dashboard-actions">
            <a href={import.meta.env.VITE_APP_URL || '/'} className="dashboard-back">Back to app</a>
            <button type="button" onClick={logout} className="dashboard-logout">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        <section className="dashboard-section">
          <h2 className="dashboard-section-title">Agent summary</h2>
          {loadingSummary ? (
            <p className="dashboard-muted">Loading…</p>
          ) : summary && Object.keys(summary).length > 0 ? (
            <div className="summary-card">
              <p><strong>Agent:</strong> {summary.name ?? summary.agent_id ?? '—'}</p>
              <p><strong>Last call:</strong> {summary.last_call_time_unix_secs ? formatDate(summary.last_call_time_unix_secs) : 'No calls yet'}</p>
              {summary.created_at_unix_secs != null && (
                <p><strong>Created:</strong> {formatDate(summary.created_at_unix_secs)}</p>
              )}
            </div>
          ) : !error ? (
            <p className="dashboard-muted">No agent summary. Check backend <code>.env</code>: ELEVENLABS_API_KEY and AGENT_ID must be set, then restart the backend.</p>
          ) : null}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2 className="dashboard-section-title">Call history</h2>
              <p className="dashboard-section-desc">Calls to Devanshi. Click a row to open the transcript.</p>
            </div>
            <button type="button" onClick={loadConversations} disabled={loadingCalls} className="dashboard-refresh">
              {loadingCalls ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {loadingCalls ? (
            <p className="dashboard-muted">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="dashboard-muted">No calls yet. After a call with the agent, click Refresh to see it here.</p>
          ) : (
            <div className="calls-table-wrap">
              <table className="calls-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Duration</th>
                    <th>Messages</th>
                    <th>Status</th>
                    <th>Summary / Title</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((c) => (
                    <tr
                      key={c.conversation_id}
                      className="calls-table-row-clickable"
                      onClick={() =>
                        navigate(`/session/${encodeURIComponent(c.conversation_id)}`, {
                          state: {
                            summary: c.transcript_summary || c.call_summary_title,
                            summaryTitle: c.call_summary_title,
                          },
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/session/${encodeURIComponent(c.conversation_id)}`, {
                            state: {
                              summary: c.transcript_summary || c.call_summary_title,
                              summaryTitle: c.call_summary_title,
                            },
                          })
                        }
                      }}
                    >
                      <td>{formatDate(c.start_time_unix_secs)}</td>
                      <td>{formatDuration(c.call_duration_secs)}</td>
                      <td>{c.message_count}</td>
                      <td>{c.call_successful ?? c.status ?? '—'}</td>
                      <td>{c.call_summary_title || c.transcript_summary || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasMore && nextCursor && (
            <p className="dashboard-muted">More calls available (next page via cursor).</p>
          )}
        </section>
      </main>
    </div>
  )
}
