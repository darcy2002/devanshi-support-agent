import { useEffect, useRef, useCallback } from 'react'
import './MovingLinesBackground.css'

const BG_COLOR = '#0a0e28'
const GRID_COLOR = 'rgba(255, 255, 255, 0.22)'
const DOT_COLOR = 'rgba(255, 255, 255, 0.7)'
const DOT_RADIUS = 2
const GRID_SPACING = 20
const DRIFT_SPEED_X = 12
const DRIFT_SPEED_Y = 8
const BULGE_RADIUS = 140
const BULGE_STRENGTH = 28

/**
 * Landing background: dense grid that drifts and bulges in/out under the cursor.
 */
export function MovingLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const mouseRef = useRef({ x: -10000, y: -10000 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -10000, y: -10000 }
  }, [])

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

    function displace(px: number, py: number): { x: number; y: number } {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const dx = px - mx
      const dy = py - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > BULGE_RADIUS || dist < 1) return { x: px, y: py }
      const t = 1 - dist / BULGE_RADIUS
      const factor = t * t * BULGE_STRENGTH
      return {
        x: px + (dx / dist) * factor,
        y: py + (dy / dist) * factor,
      }
    }

    let running = true
    let frameId = 0
    const dt = 1 / 60

    const draw = () => {
      if (!running || !canvasRef.current || !ctx) return

      const w = window.innerWidth
      const h = window.innerHeight

      offsetRef.current.x += DRIFT_SPEED_X * dt
      offsetRef.current.y += DRIFT_SPEED_Y * dt
      const ox = offsetRef.current.x % GRID_SPACING
      const oy = offsetRef.current.y % GRID_SPACING

      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = 1

      const cols = Math.ceil(w / GRID_SPACING) + 2
      const rows = Math.ceil(h / GRID_SPACING) + 2

      for (let i = -1; i < cols; i++) {
        const x = i * GRID_SPACING - ox
        ctx.beginPath()
        let first = true
        for (let y = 0; y <= h + GRID_SPACING; y += GRID_SPACING) {
          const p = displace(x, y)
          if (first) {
            ctx.moveTo(p.x, p.y)
            first = false
          } else {
            ctx.lineTo(p.x, p.y)
          }
        }
        ctx.stroke()
      }

      for (let j = -1; j < rows; j++) {
        const y = j * GRID_SPACING - oy
        ctx.beginPath()
        let first = true
        for (let x = 0; x <= w + GRID_SPACING; x += GRID_SPACING) {
          const p = displace(x, y)
          if (first) {
            ctx.moveTo(p.x, p.y)
            first = false
          } else {
            ctx.lineTo(p.x, p.y)
          }
        }
        ctx.stroke()
      }

      ctx.fillStyle = DOT_COLOR
      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          const x = i * GRID_SPACING - ox
          const y = j * GRID_SPACING - oy
          const p = displace(x, y)
          ctx.beginPath()
          ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      frameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      running = false
      window.removeEventListener('resize', setSize)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="moving-lines-background"
      aria-hidden
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}
