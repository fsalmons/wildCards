import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { icon: '../../../photos/nav_icons/card.png', label: 'Cards',   route: '/collection' },
  { icon: '../../../photos/nav_icons/compass.png', label: 'Map',     route: '/map' },
  { icon: '../../../photos/nav_icons/handshake.png', label: 'Friends', route: '/friends' },
  { icon: '../../../photos/nav_icons/trophy.png', label: 'Profile', route: '/profile' },
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
            <img
              src={tab.icon}
              alt={tab.label}
              style={{ width: 20, height: 20 }}
            />
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
