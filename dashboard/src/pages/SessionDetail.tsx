import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { getAuthHeaders } from '../auth'
import './SessionDetail.css'

type TranscriptEntry = {
  role: string
  message: string
  time_in_call_secs?: number
}

type ConversationDetail = {
  conversation_id: string
  agent_id?: string
  agent_name?: string
  status?: string
  transcript?: TranscriptEntry[]
  metadata?: {
    start_time_unix_secs?: number
    call_duration_secs?: number
  }
}

export function SessionDetail() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!conversationId) {
      setError('No conversation ID')
      setLoading(false)
      return
    }
    const headers = getAuthHeaders()
    fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, { headers })
      .then((r) => {
        if (r.status === 401) {
          logout()
          navigate('/login', { replace: true })
          return null
        }
        if (!r.ok) throw new Error('Failed to load conversation')
        return r.json()
      })
      .then((data) => {
        if (data != null) setConversation(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [conversationId, navigate, logout])

  const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString()
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m ? `${m}m ${s}s` : `${s}s`
  }
  const formatTimeInCall = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="session-detail-page">
      <header className="session-detail-header">
        <div className="session-detail-header-inner">
          <Link to="/" className="session-detail-back">← Back to call history</Link>
          <h1 className="session-detail-title">Call transcript</h1>
        </div>
      </header>

      <main className="session-detail-main">
        {error && (
          <div className="session-detail-error">{error}</div>
        )}

        {loading ? (
          <p className="session-detail-muted">Loading…</p>
        ) : conversation ? (
          <>
            <div className="session-detail-meta">
              {conversation.metadata?.start_time_unix_secs != null && (
                <p><strong>Started:</strong> {formatDate(conversation.metadata.start_time_unix_secs)}</p>
              )}
              {conversation.metadata?.call_duration_secs != null && (
                <p><strong>Duration:</strong> {formatDuration(conversation.metadata.call_duration_secs)}</p>
              )}
              {conversation.agent_name && (
                <p><strong>Agent:</strong> {conversation.agent_name}</p>
              )}
            </div>

            <section className="session-detail-transcript">
              <h2 className="session-detail-section-title">Transcript</h2>
              {conversation.transcript && conversation.transcript.length > 0 ? (
                <div className="transcript-list">
                  {conversation.transcript.map((entry, i) => (
                    <div
                      key={i}
                      className={`transcript-entry transcript-entry--${entry.role}`}
                    >
                      <div className="transcript-entry-header">
                        <span className="transcript-entry-role">
                          {entry.role === 'user' ? 'User' : 'Devanshi'}
                        </span>
                        {entry.time_in_call_secs != null && (
                          <span className="transcript-entry-time">
                            {formatTimeInCall(entry.time_in_call_secs)}
                          </span>
                        )}
                      </div>
                      <p className="transcript-entry-message">{entry.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="session-detail-muted">No transcript available for this call yet.</p>
              )}
            </section>
          </>
        ) : !error ? (
          <p className="session-detail-muted">Conversation not found.</p>
        ) : null}
      </main>
    </div>
  )
}
