import '../../styles/retro.css'

const FULL_WIDTH = 280
const FULL_HEIGHT = 400
const SMALL_WIDTH = 100
const SMALL_HEIGHT = 140

function getRatingColor(rating, teamColor) {
  if (rating >= 90) return '#FFD700'
  if (rating >= 75) return '#C0C0C0'
  return teamColor || '#FFFFFF'
}

export function PlayerCard({ player, teamColor, teamTextColor = '#FFFFFF', cardColor = '#F5ECD7', teamLogo = null, league = '', isCollected, size = 'full', rating = null }) {
  const isFull = size === 'full'
  const scale = isFull ? 1 : SMALL_WIDTH / FULL_WIDTH

  const containerStyle = {
    width: isFull ? `${FULL_WIDTH}px` : `${SMALL_WIDTH}px`,
    height: isFull ? `${FULL_HEIGHT}px` : `${SMALL_HEIGHT}px`,
    flexShrink: 0,
  }

  const cardStyle = {
    width: `${FULL_WIDTH}px`,
    height: `${FULL_HEIGHT}px`,
    backgroundColor: isCollected ? cardColor : '#E0E0E0',
    border: `7px solid ${isCollected ? teamColor : '#CCCCCC'}`,
    borderRadius: '16px',
    boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: 'Arial, sans-serif',
    transformOrigin: 'top left',
    transform: isFull ? 'none' : `scale(${scale})`,
  }

  const headerStyle = {
    padding: '12px 14px 8px',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    color: isCollected ? teamTextColor : '#FFFFFF',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }

  const ratingColor = isCollected ? teamTextColor : '#FFFFFF'
  const ratingFontSize = isFull ? '28px' : '20px'

  const ratingBlockStyle = {
    position: 'absolute',
    top: '8px',
    left: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
  }

  const ratingNumberStyle = {
    fontSize: ratingFontSize,
    fontWeight: '800',
    fontFamily: 'Arial, sans-serif',
    color: ratingColor,
    lineHeight: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  }

  const ovrLabelStyle = {
    fontSize: isFull ? '9px' : '7px',
    fontWeight: '700',
    fontFamily: 'Arial, sans-serif',
    color: isCollected ? teamTextColor : '#FFFFFF',
    opacity: 0.8,
    letterSpacing: '0.5px',
    marginTop: '2px',
  }

  const playerNameStyle = {
    fontSize: '30px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
    fontFamily: 'Arial, sans-serif',
    margin: 0,
    textAlign: 'right',
    width: '100%',
    boxSizing: 'border-box',
  }

  const playerFirstNameStyle = {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
    fontFamily: 'Arial, sans-serif',
    margin: 0,
    textAlign: 'right',
    width: '100%',
    boxSizing: 'border-box',
  }

  const playerLastNameStyle = {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
    fontFamily: 'Arial, sans-serif',
    margin: 0,
    textAlign: 'right',
    width: '100%',
    boxSizing: 'border-box',
  }

  const teamNameStyle = {
    fontSize: '12px',
    opacity: 0.85,
    marginTop: '2px',
    fontFamily: 'Arial, sans-serif',
    letterSpacing: '0.3px',
    textAlign: 'right',
  }

  const imageAreaStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  }

  const faceImageStyle = {
    width: 'auto', 
    height: '75%', 
    objectFit: 'contain', 
    objectPosition: 'bottom',
    marginBottom: '6px',
  }

  const greyCircleStyle = {
    width: '140px',
    height: '160px',
    backgroundColor: '#CCCCCC',
    borderRadius: '8px',
    border: '2px solid #BBBBBB',
  }

  const statsRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 14px 8px',
  }

  const statBlockStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  }

  const statLabelStyle = {
    fontSize: '9px',
    color: isCollected ? teamColor : '#888888',
    opacity: isCollected ? 0.6 : 1,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'Arial, sans-serif',
  }

  const statValueStyle = {
    fontSize: '13px',
    color: isCollected ? teamColor : '#AAAAAA',
    fontFamily: 'Arial, sans-serif',
    fontWeight: '600',
  }

  const dividerStyle = {
    height: '2px',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    margin: '0 14px',
    opacity: 0.3,
  }

  const bottomBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    color: isCollected ? teamTextColor : '#FFFFFF',

    flex: '0 0 80px',
  }

  const bottomTeamStyle = {
    fontSize: '11px',
    fontFamily: 'Arial, sans-serif',
    letterSpacing: '0.5px',
    opacity: 0.9,
  }

  const cardNumberStyle = {
    fontSize: '11px',
    fontFamily: 'Arial, sans-serif',
    opacity: 0.85,
  }

  const displayName = `${player.firstName} ${player.lastName}`
  const displayFirstName = `${player.firstName}`
  const displayLastName = `${player.lastName}`

  const displayAge = isCollected ? player.age : '?'
  const displayPosition = isCollected ? player.position : '?'
  const cardNum = player.cardNumber
    ? `#${String(player.cardNumber).padStart(3, '0')}`
    : '#???'

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        {/* Top overlay (rating + logo only) */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <div style={ratingBlockStyle}>
            <span style={ratingNumberStyle}>
              {rating !== null ? rating : '—'}
            </span>
            <span style={ovrLabelStyle}>OVR</span>
          </div>
        </div>

        {isCollected && teamLogo && (
          <img
            src={teamLogo}
            alt=""
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 36,
              height: 36,
              objectFit: 'contain',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))',
              pointerEvents: 'none',
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Face image */}
        <div style={imageAreaStyle}>
          {isCollected && player.faceImage ? (
            <img
              src={player.faceImage}
              alt={displayName}
              style={faceImageStyle}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextSibling.style.display = 'block'
              }}
            />
          ) : null}
          {/*
          <div
            style={{
              ...greyCircleStyle,
              display: isCollected && player.faceImage ? 'none' : 'block',
            }}
          />
          */}

        </div>

        {/* Stats LEFT aligned 
        <div style={{
          ...statsRowStyle,
          justifyContent: 'flex-start',
          gap: '12px'
        }}>
          <div style={statBlockStyle}>
            <span style={statLabelStyle}>Position</span>
            <span style={statValueStyle}>{displayPosition}</span>
          </div>
        </div>
        

      
        <div style={dividerStyle} />

        */}
        {/* Footer */}
        <div style={{
          ...bottomBarStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 10px'
        }}>

          {/* LEFT: Division / League */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px'
          }}>
            <span style={{ fontSize: '18px' }}>?</span>

            <span style={{
              ...bottomTeamStyle,
              fontSize: '10px',
              opacity: 0.8
            }}>
              {league || ''}
            </span>
          </div>

          {/* RIGHT: Player Identity */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            textAlign: 'right',
            position: 'relative',
            overflow: 'hidden',
            padding: '2px 6px'
          }}>

            {/* Background logo */}
            {isCollected && teamLogo && (
              <img
                src={teamLogo}
                alt=""
                style={{
                  position: 'absolute',
                  left: '-10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '60px',
                  height: '60px',
                  objectFit: 'contain',
                  opacity: 0.5,
                  filter: 'grayscale(1)',
                  pointerEvents: 'none',
                }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}

            {/* Player name (foreground) */}
            <span style={{
              ...playerFirstNameStyle,
              position: 'relative',
              zIndex: 2
            }}>
              {displayFirstName}
            </span>

            <span style={{
              ...playerLastNameStyle,
              position: 'relative',
              zIndex: 2
            }}>
              {displayLastName}
            </span>

            {/* Team name */}
            <span style={{
              ...teamNameStyle,
              position: 'relative',
              zIndex: 2
            }}>
              {player.team || ''}
            </span>

          </div>
        </div>
      </div>
    </div>

  )
}
