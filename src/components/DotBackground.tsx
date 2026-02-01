import { useEffect, useRef } from 'react'
import './DotBackground.css'

/** Dot spacing in pixels - dense grid */
const SPACING = 14
const BASE_RADIUS = 1.4
/** How much volume affects scale (radius) */
const VOLUME_SCALE = 0.9
/** How much volume affects vertical wave amplitude */
const WAVE_AMPLITUDE = 4
/** Base wave speed; increases with volume to suggest speech speed */
const WAVE_SPEED_BASE = 0.002
const WAVE_SPEED_VOLUME = 0.008
/** Opacity range */
const OPACITY_MIN = 0.15
const OPACITY_MAX = 0.55

interface DotBackgroundProps {
  inputVolume: number
  outputVolume: number
}

/**
 * Full-screen canvas of dense dots that react to voice:
 * scale, vertical wave motion, and opacity follow combined input/output volume
 * to suggest frequency, modulation, and speech rhythm.
 */
export function DotBackground({ inputVolume, outputVolume }: DotBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const volumesRef = useRef({ inputVolume, outputVolume })
  volumesRef.current = { inputVolume, outputVolume }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    setSize()
    window.addEventListener('resize', setSize)

    let running = true

    const draw = () => {
      if (!running || !canvasRef.current || !ctx) return

      const w = window.innerWidth
      const h = window.innerHeight
      timeRef.current += 1

      const { inputVolume: inV, outputVolume: outV } = volumesRef.current
      const t = timeRef.current
      const totalVolume = Math.min(1, (inV + outV) * 0.6)
      const waveSpeed = WAVE_SPEED_BASE + totalVolume * WAVE_SPEED_VOLUME
      const waveAmp = WAVE_AMPLITUDE * (0.3 + totalVolume * 0.7)
      const radiusScale = 1 + totalVolume * VOLUME_SCALE
      const opacity = OPACITY_MIN + totalVolume * (OPACITY_MAX - OPACITY_MIN)

      ctx.clearRect(0, 0, w, h)

      const cols = Math.ceil(w / SPACING) + 2
      const rows = Math.ceil(h / SPACING) + 2

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const baseX = i * SPACING
          const baseY = j * SPACING
          const phase = (i * 0.3 + j * 0.2) * Math.PI
          const wave = Math.sin(t * waveSpeed + phase) * waveAmp
          const y = baseY + wave
          const r = BASE_RADIUS * radiusScale
          ctx.beginPath()
          ctx.arc(baseX, y, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(99, 102, 241, ${opacity})`
          ctx.fill()
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      running = false
      window.removeEventListener('resize', setSize)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="dot-background" aria-hidden />
}
