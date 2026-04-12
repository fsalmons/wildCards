import { useState } from 'react'
import { PlayerCard } from '../Card/PlayerCard'
import { fillRandomSlots } from '../../lib/competitionUtils'

const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'

function toProps(uc) {
  const p = uc.player
  return {
    player: {
      firstName: p.first_name ?? p.firstName ?? '',
      lastName: p.last_name ?? p.lastName ?? '',
      faceImage: p.face_image ?? p.faceImage ?? null,
      position: p.position ?? '',
      age: p.age ?? '',
      cardNumber: p.card_number ?? p.cardNumber ?? null,
      team: p.team?.name ?? '',
    },
    teamColor: p.team?.primary_color ?? BROWN,
    teamTextColor: p.team?.text_color ?? '#FFFFFF',
    cardColor: p.team?.card_color ?? '#F5ECD7',
    teamLogo: p.team?.logo_url ?? null,
    league: p.team?.sport ?? '',
    isCollected: true,
    size: 'small',
    rating: uc.rating,
  }
}

function CardPickerModal({ availableCards, excludeIds, onSelect, onClose }) {
  const filtered = availableCards.filter(c => !excludeIds.has(c.id))
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: BEIGE, borderRadius: '20px 20px 0 0', width: '100%',
          maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 10px', borderBottom: '2px solid #E8D5B5', flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '18px', color: '#3B1A08', margin: 0 }}>
            Pick a Card (Lock-In)
          </h2>
          <button
            style={{
              backgroundColor: 'transparent', border: 'none', fontSize: '20px',
              color: BROWN, cursor: 'pointer', padding: '4px 8px', minHeight: '44px', minWidth: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {filtered.length === 0 ? (
          <p style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px',
            color: '#8B6A4E', textAlign: 'center', padding: '32px 16px',
          }}>
            No cards available.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px', padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          }}>
            {filtered.map(card => {
              const props = toProps(card)
              return (
                <button
                  key={card.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    backgroundColor: 'transparent', border: '2px solid transparent',
                    borderRadius: '12px', padding: '6px', cursor: 'pointer', boxSizing: 'border-box',
                  }}
                  onClick={() => onSelect(card)}
                >
                  <PlayerCard {...props} />
                  <span style={{
                    fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '11px',
                    color: '#3B1A08', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word',
                  }}>
                    {props.player.firstName} {props.player.lastName}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmModal({ onConfirm, onCancel, emptyCount }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        backgroundColor: BEIGE, borderRadius: '20px', padding: '28px 24px',
        maxWidth: '340px', width: '100%', boxSizing: 'border-box',
        border: `3px solid ${BROWN}`, boxShadow: `0 6px 0 #5C2A00`,
      }}>
        <h2 style={{
          fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '20px',
          color: '#3B1A08', margin: '0 0 12px', textAlign: 'center',
        }}>
          Ready?
        </h2>
        <p style={{
          fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px',
          color: '#5A2D0C', textAlign: 'center', margin: '0 0 24px',
        }}>
          {emptyCount > 0
            ? `${emptyCount} empty slot${emptyCount > 1 ? 's' : ''} will be randomly filled.`
            : 'Submit your team for this round?'}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1, backgroundColor: BROWN, color: '#FFF', border: 'none',
              borderRadius: '14px', padding: '14px', minHeight: '50px',
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px',
              cursor: 'pointer', boxShadow: '0 3px 0 #5C2A00',
            }}
            onClick={onConfirm}
          >
            Submit!
          </button>
          <button
            style={{
              flex: 1, backgroundColor: 'transparent', color: BROWN,
              border: `2px solid ${BROWN}`, borderRadius: '14px', padding: '14px',
              minHeight: '50px', fontFamily: 'Arial, sans-serif', fontWeight: 800,
              fontSize: '17px', cursor: 'pointer',
            }}
            onClick={onCancel}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export function CompeteRoundPicker({ availableCards, lockedInsRemaining, onSubmit }) {
  // slots: array of 5 items — null | { card, isLocked: bool }
  const [slots, setSlots] = useState([null, null, null, null, null])
  const [localLockIns, setLocalLockIns] = useState(lockedInsRemaining)
  const [showPicker, setShowPicker] = useState(null) // slotIndex | null
  const [showConfirm, setShowConfirm] = useState(false)

  const filledSlotIds = new Set(slots.filter(Boolean).map(s => s.card.id))
  const emptyCount = slots.filter(s => s === null).length

  function handleSlotTap(idx) {
    if (slots[idx] !== null) {
      // Only locked (hand-picked) slots can be removed; random slots are permanent
      if (!slots[idx].isLocked) return
      const newSlots = [...slots]
      setLocalLockIns(prev => prev + 1)
      newSlots[idx] = null
      setSlots(newSlots)
      return
    }
    if (localLockIns > 0) {
      setShowPicker(idx)
    } else {
      // Pick randomly from available (excluding already in slots)
      const available = availableCards.filter(c => !filledSlotIds.has(c.id))
      if (available.length === 0) return
      const card = available[Math.floor(Math.random() * available.length)]
      const newSlots = [...slots]
      newSlots[idx] = { card, isLocked: false }
      setSlots(newSlots)
    }
  }

  function handlePickCard(card) {
    if (showPicker === null) return
    const newSlots = [...slots]
    newSlots[showPicker] = { card, isLocked: true }
    setSlots(newSlots)
    setLocalLockIns(prev => prev - 1)
    setShowPicker(null)
  }

  function handleConfirm() {
    // Fill empty slots randomly
    const finalSlots = [...slots]
    const usedIds = new Set(finalSlots.filter(Boolean).map(s => s.card.id))
    const remaining = availableCards.filter(c => !usedIds.has(c.id)).sort(() => Math.random() - 0.5)
    let ri = 0
    for (let i = 0; i < 5; i++) {
      if (finalSlots[i] === null) {
        if (ri < remaining.length) {
          finalSlots[i] = { card: remaining[ri++], isLocked: false }
        }
      }
    }
    setSlots(finalSlots)
    setShowConfirm(false)

    const cardIds = finalSlots.filter(Boolean).map(s => s.card.id)
    const lockedCardIds = finalSlots.filter(s => s?.isLocked).map(s => s.card.id)
    onSubmit({ cardIds, lockedCardIds })
  }

  // 3-2 grid layout: top row 3 slots, bottom row 2 slots
  const topSlots = [0, 1, 2]
  const bottomSlots = [3, 4]

  function renderSlot(idx) {
    const slot = slots[idx]
    return (
      <div
        key={idx}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
      >
        {slot ? (
          <button
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: slot.isLocked ? 'pointer' : 'default',
              position: 'relative', borderRadius: '12px', overflow: 'visible',
            }}
            onClick={() => handleSlotTap(idx)}
            title={slot.isLocked ? 'Tap to remove' : 'Randomly assigned'}
          >
            <PlayerCard {...toProps(slot.card)} />
            <span style={{
              position: 'absolute', top: '-8px', right: '-8px',
              fontSize: '18px', lineHeight: 1, pointerEvents: 'none',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }}>
              {slot.isLocked ? '⚡' : '🎲'}
            </span>
          </button>
        ) : (
          <button
            style={{
              width: '90px', height: '126px', border: '3px dashed #C8A97A',
              borderRadius: '14px', backgroundColor: '#FFF8EC',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '4px', cursor: 'pointer', boxSizing: 'border-box',
            }}
            onClick={() => handleSlotTap(idx)}
          >
            <span style={{ fontSize: '24px', color: '#C8A97A', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>+</span>
            <span style={{ fontSize: '10px', color: '#A07850', fontFamily: 'Arial, sans-serif', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {localLockIns > 0 ? 'Lock-In' : 'Random'}
            </span>
          </button>
        )}
      </div>
    )
  }

  const allFilled = slots.every(Boolean)

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {showPicker !== null && (
        <CardPickerModal
          availableCards={availableCards}
          excludeIds={filledSlotIds}
          onSelect={handlePickCard}
          onClose={() => setShowPicker(null)}
        />
      )}
      {showConfirm && (
        <ConfirmModal
          emptyCount={emptyCount}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{
        backgroundColor: CARD_BG, borderRadius: '12px', padding: '12px',
        border: `2px solid ${BROWN}`, marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>🔒</span>
        <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px', color: BROWN }}>
          Lock-Ins: {localLockIns} remaining
        </span>
      </div>

      {/* Top row — 3 slots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {topSlots.map(idx => renderSlot(idx))}
      </div>

      {/* Bottom row — 2 slots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        {bottomSlots.map(idx => renderSlot(idx))}
      </div>

      <button
        style={{
          width: '100%', backgroundColor: allFilled || emptyCount < 5 ? BROWN : '#C8A97A',
          color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '14px',
          minHeight: '50px', fontFamily: 'Arial, sans-serif', fontWeight: 800,
          fontSize: '17px', cursor: slots.some(Boolean) ? 'pointer' : 'not-allowed',
          boxShadow: slots.some(Boolean) ? '0 3px 0 #5C2A00' : 'none',
          opacity: slots.some(Boolean) ? 1 : 0.5,
        }}
        onClick={() => { if (slots.some(Boolean)) setShowConfirm(true) }}
        disabled={!slots.some(Boolean)}
      >
        Submit Round
      </button>
    </div>
  )
}
