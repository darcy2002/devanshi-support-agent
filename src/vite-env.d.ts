/// <reference types="vite/client" />

/**
 * Environment variable for your ElevenLabs Agent ID.
 * Set this in .env as VITE_ELEVENLABS_AGENT_ID=your_agent_id
 * Get your Agent ID from: https://elevenlabs.io/app/agents
 */
interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_AGENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
