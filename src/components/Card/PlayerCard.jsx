import '../../styles/retro.css'

const FULL_WIDTH = 280
const FULL_HEIGHT = 400
const SMALL_WIDTH = 100
const SMALL_HEIGHT = 140

export function PlayerCard({ player, teamColor, isCollected, size = 'full' }) {
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
    backgroundColor: '#F5ECD7',
    border: `3px solid ${isCollected ? teamColor : '#CCCCCC'}`,
    borderRadius: '16px',
    boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    transformOrigin: 'top left',
    transform: isFull ? 'none' : `scale(${scale})`,
  }

  const headerStyle = {
    padding: '12px 14px 8px',
    textAlign: 'center',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    color: '#FFFFFF',
  }

  const playerNameStyle = {
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
    fontFamily: 'Arial, sans-serif',
    margin: 0,
  }

  const teamNameStyle = {
    fontSize: '12px',
    opacity: 0.85,
    marginTop: '2px',
    fontFamily: 'Arial, sans-serif',
    letterSpacing: '0.3px',
  }

  const imageAreaStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    position: 'relative',
  }

  const faceImageStyle = {
    width: '140px',
    height: '160px',
    objectFit: 'cover',
    objectPosition: 'top',
    borderRadius: '8px',
    border: `2px solid ${isCollected ? teamColor : '#CCCCCC'}`,
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
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'Arial, sans-serif',
  }

  const statValueStyle = {
    fontSize: '13px',
    color: isCollected ? '#333333' : '#AAAAAA',
    fontFamily: 'Arial, sans-serif',
    fontWeight: '600',
  }

  const dividerStyle = {
    height: '2px',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    margin: '0 14px',
    opacity: 0.4,
  }

  const bottomBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    backgroundColor: isCollected ? teamColor : '#CCCCCC',
    color: '#FFFFFF',
    marginTop: 'auto',
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

  const displayName = isCollected
    ? `${player.firstName} ${player.lastName}`
    : '???'

  const displayAge = isCollected ? player.age : '?'
  const displayPosition = isCollected ? player.position : '?'
  const cardNum = player.cardNumber
    ? `#${String(player.cardNumber).padStart(3, '0')}`
    : '#???'

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <p style={playerNameStyle}>{displayName}</p>
          <p style={teamNameStyle}>{player.team || ''}</p>
        </div>

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
          <div
            style={{
              ...greyCircleStyle,
              display: isCollected && player.faceImage ? 'none' : 'block',
            }}
          />
        </div>

        {/* Stats row */}
        <div style={statsRowStyle}>
          <div style={statBlockStyle}>
            <span style={statLabelStyle}>Age</span>
            <span style={statValueStyle}>{displayAge}</span>
            <span style={{ ...statLabelStyle, marginTop: '6px' }}>Position</span>
            <span style={statValueStyle}>{displayPosition}</span>
          </div>
          <div style={{ ...statBlockStyle, textAlign: 'right' }} />
        </div>

        {/* Divider */}
        <div style={dividerStyle} />

        {/* Bottom bar */}
        <div style={bottomBarStyle}>
          <span style={bottomTeamStyle}>{player.team || ''}</span>
          <span style={cardNumberStyle}>{cardNum}</span>
        </div>
      </div>
    </div>
  )
}
