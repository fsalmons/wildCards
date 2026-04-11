import { useState, useCallback, useRef } from 'react'
import { useSwipeable } from 'react-swipeable'
import { PlayerCard } from '../Card/PlayerCard'
import '../../styles/retro.css'

const TOTAL_CARDS = 5

export function CardSwipeFlow({ cards, teamColor, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animState, setAnimState] = useState('idle') // 'idle' | 'exiting' | 'entering'
  const [showConfirm, setShowConfirm] = useState(false)
  const isAnimating = useRef(false)

  const advance = useCallback(() => {
    if (isAnimating.current) return

    const nextIndex = currentIndex + 1

    if (nextIndex >= cards.length) {
      // Last card — show confirmation
      isAnimating.current = true
      setAnimState('exiting')
      setTimeout(() => {
        setShowConfirm(true)
        isAnimating.current = false
      }, 280)
      return
    }

    isAnimating.current = true
    setAnimState('exiting')

    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setAnimState('entering')

      // Remove entering class after animation completes
      setTimeout(() => {
        setAnimState('idle')
        isAnimating.current = false
      }, 350)
    }, 280)
  }, [currentIndex, cards.length])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: advance,
    onSwipedRight: advance,
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 40,
  })

  const handleTap = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const tapX = e.clientX - rect.left
      // Right half of screen advances
      if (tapX >= rect.width / 2) {
        advance()
      }
    },
    [advance],
  )

  const screenStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9998,
    backgroundColor: '#F5ECD7',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'pan-y',
  }

  const dotsContainerStyle = {
    position: 'absolute',
    top: '24px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    zIndex: 1,
  }

  const hintStyle = {
    position: 'absolute',
    bottom: '28px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#999',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
  }

  if (showConfirm) {
    return (
      <div style={{ ...screenStyle, flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            fontSize: '64px',
            animation: 'walk-bob 0.4s ease-in-out infinite alternate',
          }}
        >
          ⭐
        </div>
        <h2
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            color: '#333',
            textAlign: 'center',
            margin: 0,
            padding: '0 32px',
          }}
        >
          {cards.length} new cards added!
        </h2>
        <p
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#777',
            margin: 0,
          }}
        >
          They&apos;re in your collection now.
        </p>
        <button
          onClick={onComplete}
          style={{
            marginTop: '8px',
            padding: '14px 48px',
            backgroundColor: teamColor,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
          }}
          onPointerDown={(e) =>
            (e.currentTarget.style.transform = 'scale(0.97)')
          }
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Continue
        </button>
      </div>
    )
  }

  const card = cards[currentIndex]

  const cardAnimClass =
    animState === 'exiting'
      ? 'card-exit'
      : animState === 'entering'
        ? 'card-enter'
        : ''

  return (
    <div
      {...swipeHandlers}
      style={screenStyle}
      onClick={handleTap}
      role="region"
      aria-label={`Card ${currentIndex + 1} of ${cards.length}`}
    >
      {/* Progress dots */}
      <div style={dotsContainerStyle} aria-hidden="true">
        {Array.from({ length: Math.min(cards.length, TOTAL_CARDS) }).map(
          (_, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor:
                  i <= currentIndex ? teamColor : 'rgba(0,0,0,0.15)',
                transition: 'background-color 0.25s',
                boxShadow:
                  i === currentIndex
                    ? `0 0 0 2px ${teamColor}44`
                    : 'none',
              }}
            />
          ),
        )}
      </div>

      {/* Card */}
      <div
        key={currentIndex}
        className={cardAnimClass}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <PlayerCard
          player={card}
          teamColor={teamColor}
          isCollected
          size="full"
        />
      </div>

      <p style={hintStyle}>Swipe or tap to reveal next card</p>
    </div>
  )
}
