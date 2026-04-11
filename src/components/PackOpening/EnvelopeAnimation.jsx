import { useEffect } from 'react'
import '../../styles/retro.css'

export function EnvelopeAnimation({ teamColor, onComplete }) {
  useEffect(() => {
    // 0.3s (css delay) + 1.2s animation + 0.1s buffer = 1.6s total
    const timer = setTimeout(() => {
      onComplete()
    }, 1600)

    return () => clearTimeout(timer)
  }, [onComplete])

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  }

  const labelStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '22px',
    color: '#FFFFFF',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    opacity: 0.9,
  }

  // Derive a slightly darker flap color by layering a dark overlay
  // We render the overlay polygon as a separate element so the flap
  // SVG polygon can animate cleanly on its own.
  const flapColor = teamColor

  return (
    <div style={overlayStyle} aria-live="polite" aria-label="Opening pack">
      <p style={labelStyle}>Opening Pack...</p>

      <div style={{ perspective: '600px' }}>
        <svg
          width="180"
          height="220"
          viewBox="0 0 180 220"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Envelope body */}
          <rect x="0" y="40" width="180" height="180" rx="8" fill={teamColor} />

          {/* Bottom triangle fold — decorative shadow */}
          <polygon
            points="0,220 90,140 180,220"
            fill="rgba(0,0,0,0.12)"
          />

          {/* PACK label */}
          <text
            x="90"
            y="175"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
          >
            PACK
          </text>

          {/* Flap — animates open via CSS */}
          <polygon
            points="0,40 90,120 180,40"
            fill={flapColor}
            style={{ filter: 'brightness(0.75)' }}
            className="envelope-flap"
          />
        </svg>
      </div>
    </div>
  )
}
