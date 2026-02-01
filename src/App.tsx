import { useState } from 'react'
import { VoiceAgent } from './components/VoiceAgent'
import { MovingLinesBackground } from './components/MovingLinesBackground'
import './App.css'

/**
 * Main App - Landing page with "Talk now with Devanshi" CTA
 * Clicking the CTA launches the voice conversation interface
 */
function App() {
  const [isConversationActive, setIsConversationActive] = useState(false)

  const handleStartConversation = () => {
    setIsConversationActive(true)
  }

  const handleEndConversation = () => {
    setIsConversationActive(false)
  }

  return (
    <>
      {!isConversationActive ? (
        /* Landing: full-viewport moving lines background + hero card */
        <div className="landing-screen">
          <MovingLinesBackground />
          <div className="landing-card-wrap">
            <section className="hero">
              <div className="hero-visual">
                <div className="orb-placeholder" aria-hidden="true" />
              </div>
              <h1 className="hero-title">Support Agent</h1>
              <p className="hero-subtitle">
                Get help from Devanshi, your AI support assistant. Click below to start a voice conversation.
              </p>
              <button
                className="cta-button"
                onClick={handleStartConversation}
                type="button"
              >
                <span className="cta-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                Talk now with Devanshi
              </button>
            </section>
          </div>
        </div>
      ) : (
        /* Voice conversation interface - shown when call is active */
        <VoiceAgent onEndSession={handleEndConversation} />
      )}
    </>
  )
}

export default App
