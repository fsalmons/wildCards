import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { emoji: '📚', label: 'Cards',   route: '/collection' },
  { emoji: '🗺️', label: 'Map',     route: '/map' },
  { emoji: '👥', label: 'Friends', route: '/friends' },
]

const ACTIVE_COLOR   = '#8B4513'
const INACTIVE_COLOR = '#B0A090'

export function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#FAF3E0',
        borderTop: '2px solid #8B4513',
        display: 'flex',
        zIndex: 10000,
      }}
    >
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.route)
        const color    = isActive ? ACTIVE_COLOR : INACTIVE_COLOR

        return (
          <button
            key={tab.route}
            onClick={() => navigate(tab.route)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              color,
              transition: 'color 0.15s ease',
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>{tab.emoji}</span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
