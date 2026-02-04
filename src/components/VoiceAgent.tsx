import { useCallback, useEffect, useRef, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import { DotBackground } from './DotBackground'
import './VoiceAgent.css'

/**
 * Agent ID from environment. Must be set in .env:
 * VITE_ELEVENLABS_AGENT_ID=your_agent_id
 * Get from: https://elevenlabs.io/app/agents
 */
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? ''
/** Backend API URL so we can notify when user starts/ends a call (dashboard refreshes on this). */
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function notifyAgentActivity() {
  if (!API_URL) return
  fetch(`${API_URL}/api/agent-activity`, { method: 'POST' }).catch(() => {})
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | null

interface VoiceAgentProps {
  onEndSession: () => void
}

/**
 * VoiceAgent - Connects to your ElevenLabs Conversational Agent via WebRTC.
 * Handles voice call, transcript display, and connection state.
 * Based on: https://ui.elevenlabs.io/blocks/agents
 */
export function VoiceAgent({ onEndSession }: VoiceAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [agentState, setAgentState] = useState<ConnectionStatus>('disconnected')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [liveInputVolume, setLiveInputVolume] = useState(0)
  const [liveOutputVolume, setLiveOutputVolume] = useState(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const conversation = useConversation({
    onConnect: () => {
      setMessages([])
      notifyAgentActivity()
    },
    onDisconnect: () => {
      setMessages([])
      setAgentState('disconnected')
      notifyAgentActivity()
    },
    onMessage: (message) => {
      if (message.message) {
        const newMessage: ChatMessage = {
          role: message.source === 'user' ? 'user' : 'assistant',
          content: message.message,
        }
        setMessages((prev) => [...prev, newMessage])
      }
    },
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error)
      setAgentState('disconnected')
    },
  })

  const getMicStream = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      setErrorMessage(null)
      return stream
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Please enable microphone permissions in your browser.')
      }
      throw error
    }
  }, [])

  const startSession = useCallback(async () => {
    if (!AGENT_ID) {
      setErrorMessage('Agent ID not configured. Add VITE_ELEVENLABS_AGENT_ID to .env')
      return
    }
    try {
      setErrorMessage(null)
      setAgentState('connecting')
      await getMicStream()
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'webrtc',
        onStatusChange: (status) => setAgentState(status.status),
      })
    } catch (error) {
      console.error('Failed to start session:', error)
      setAgentState('disconnected')
    }
  }, [conversation, getMicStream])

  const endSession = useCallback(() => {
    setAgentState('disconnecting')
    conversation.endSession()
    setAgentState('disconnected')
    setMessages([])
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    setErrorMessage(null)
    notifyAgentActivity()
  }, [conversation])

  const goBack = useCallback(() => {
    if (agentState === 'connected' || agentState === 'connecting') {
      endSession()
    }
    onEndSession()
  }, [agentState, endSession, onEndSession])

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const isCallActive = agentState === 'connected'
  const isTransitioning = agentState === 'connecting' || agentState === 'disconnecting'

  // Orb agent state: "talking" when agent audio is playing, "listening" when connected, else idle
  const orbAgentState: 'listening' | 'talking' | null =
    agentState === 'connected'
      ? liveOutputVolume > 0.05
        ? 'talking'
        : 'listening'
      : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getInputVolume = useCallback(() => {
    const rawValue = conversation.getInputVolume?.() ?? 0
    return Math.min(1.0, Math.pow(rawValue, 0.5) * 2.5)
  }, [conversation])

  const getOutputVolume = useCallback(() => {
    const rawValue = conversation.getOutputVolume?.() ?? 0
    return Math.min(1.0, Math.pow(rawValue, 0.5) * 2.5)
  }, [conversation])

  useEffect(() => {
    let rafId = 0
    const tick = () => {
      setLiveInputVolume(getInputVolume())
      setLiveOutputVolume(getOutputVolume())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [getInputVolume, getOutputVolume])

  if (!AGENT_ID) {
    return (
      <div className="voice-agent voice-agent--error">
        <p>
          Missing <code>VITE_ELEVENLABS_AGENT_ID</code>. Add it in <code>.env</code> and restart the dev server.
        </p>
        <p className="voice-agent__hint">
          Get your Agent ID from{' '}
          <a href="https://elevenlabs.io/app/agents" target="_blank" rel="noopener noreferrer">
            ElevenLabs Agents
          </a>
        </p>
        <button className="cta-button" onClick={onEndSession} type="button">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="voice-screen">
      <DotBackground inputVolume={liveInputVolume} outputVolume={liveOutputVolume} />
      <div className="voice-agent voice-agent--card">
        <header className="voice-agent__header">
          <button
          type="button"
          className="voice-agent__back-btn"
          onClick={goBack}
          title="Go back to home"
          aria-label="Go back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
            Back
          </button>
          <div className="voice-agent__header-left">
            <div
              className={`voice-agent__orb ${orbAgentState ? `voice-agent__orb--${orbAgentState}` : ''}`}
              style={
                {
                  '--input-volume': getInputVolume(),
                  '--output-volume': getOutputVolume(),
                } as React.CSSProperties
              }
              aria-label={orbAgentState === 'talking' ? 'Agent speaking' : orbAgentState === 'listening' ? 'Listening' : undefined}
            />
            <div className="voice-agent__header-text">
              <p className="voice-agent__name">Devanshi</p>
              <p className="voice-agent__status">
                {errorMessage
                  ? errorMessage
                  : agentState === 'disconnected' || agentState === null
                    ? 'Tap to start voice chat'
                    : agentState === 'connected'
                      ? 'Connected'
                      : agentState}
              </p>
            </div>
          </div>
          <div
            className={`voice-agent__indicator ${
              agentState === 'connected' ? 'voice-agent__indicator--active' : ''
            } ${isTransitioning ? 'voice-agent__indicator--pulse' : ''}`}
          />
        </header>

        <div className="voice-agent__content">
          <div className="voice-agent__messages">
          {messages.length === 0 ? (
            <div className="voice-agent__empty">
              <div className={`voice-agent__empty-orb ${orbAgentState ? `voice-agent__empty-orb--${orbAgentState}` : ''}`} />
              <p className="voice-agent__empty-title">
                {isTransitioning ? 'Starting conversation...' : 'Start talking'}
              </p>
              <p className="voice-agent__empty-desc">
                {isTransitioning ? 'Connecting...' : 'Ready to chat with Devanshi'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`voice-agent__message-widget voice-agent__message-widget--${msg.role}`}
                  data-from={msg.role}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className={`voice-agent__message-avatar voice-agent__message-avatar--orb ${i === messages.length - 1 && orbAgentState === 'talking' ? 'voice-agent__message-avatar--talking' : ''}`}
                      aria-hidden
                      title={i === messages.length - 1 && orbAgentState === 'talking' ? 'Devanshi is speaking' : 'Devanshi'}
                    />
                  )}
                  <div className="voice-agent__message-content-wrap">
                    <span className="voice-agent__message-sender">
                      {msg.role === 'assistant' ? 'Devanshi' : 'You'}
                    </span>
                    <div className="voice-agent__message-content">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
            )}
          </div>
        </div>

        <footer className="voice-agent__footer">
        {agentState === 'disconnected' || agentState === null ? (
          <button
            className="voice-agent__start-btn"
            onClick={startSession}
            disabled={!!errorMessage}
            type="button"
            title="Start voice call with Devanshi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Start call
          </button>
        ) : (
          <button
            className="voice-agent__end-btn"
            onClick={() => {
              endSession()
              onEndSession()
            }}
            disabled={isTransitioning}
            type="button"
            title="End call and go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            End call
          </button>
          )}
        </footer>
      </div>
    </div>
  )
}
