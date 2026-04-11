import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard } from '../components/Card/PlayerCard'
import { BottomNav } from '../components/Nav/BottomNav'

// Converts a user_cards row (with nested player + team) into the shape PlayerCard expects
function toPlayerCardProps(userCard) {
  const p = userCard?.player
  if (!p) return null
  return {
    player: {
      firstName: p.first_name ?? p.firstName ?? '',
      lastName: p.last_name ?? p.lastName ?? '',
      age: p.age ?? '',
      position: p.position ?? '',
      height: p.height ?? '',
      weight: p.weight ?? '',
      cardNumber: p.card_number ?? p.cardNumber ?? null,
      faceImage: p.face_image ?? p.faceImage ?? null,
      team: p.team?.name ?? p.team_name ?? '',
    },
    teamColor: p.team?.primary_color ?? '#8B4513',
    isCollected: true,
    size: 'small',
  }
}

export function TradePage() {
  const navigate = useNavigate()
  const { friendId } = useParams()

  const [userId, setUserId] = useState(null)
  const [friend, setFriend] = useState(null)
  const [myCards, setMyCards] = useState([])
  const [theirCards, setTheirCards] = useState([])
  const [pendingTrade, setPendingTrade] = useState(null) // null = no trade, object = trade row

  // For the offer builder
  const [mySelected, setMySelected] = useState(null) // userCard row
  const [theirSelected, setTheirSelected] = useState(null) // userCard row

  // Modal state
  const [modal, setModal] = useState(null) // null | 'mine' | 'theirs'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Auth guard
  useEffect(() => {
    const raw = localStorage.getItem('scc_user')
    if (!raw) { navigate('/login'); return }
    const parsed = JSON.parse(raw)
    if (!parsed?.id) { navigate('/login'); return }
    setUserId(parsed.id)
  }, [navigate])

  useEffect(() => {
    if (!userId || !friendId) return
    fetchAll()
  }, [userId, friendId])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [friendRes, myCardsRes, theirCardsRes, tradeRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', friendId).single(),
        supabase
          .from('user_cards')
          .select('id, player:players(*, team:teams(name,primary_color))')
          .eq('user_id', userId),
        supabase
          .from('user_cards')
          .select('id, player:players(*, team:teams(name,primary_color))')
          .eq('user_id', friendId),
        supabase
          .from('trades')
          .select('*')
          .or(
            `and(proposer_id.eq.${userId},receiver_id.eq.${friendId}),and(proposer_id.eq.${friendId},receiver_id.eq.${userId})`
          )
          .eq('status', 'pending')
          .maybeSingle(),
      ])

      if (friendRes.error) throw friendRes.error
      setFriend(friendRes.data)

      setMyCards(myCardsRes.data || [])
      setTheirCards(theirCardsRes.data || [])

      const trade = tradeRes.data || null
      setPendingTrade(trade)

      // If there is a pending trade proposed by the friend (we are receiver), pre-populate slots
      if (trade && trade.proposer_id === friendId) {
        const offeredCard = (myCardsRes.data || []).find(
          (c) => c.id === trade.requested_card_id
        ) || (theirCardsRes.data || []).find(
          (c) => c.id === trade.requested_card_id
        )
        const requestedCard = (myCardsRes.data || []).find(
          (c) => c.id === trade.offered_card_id
        ) || (theirCardsRes.data || []).find(
          (c) => c.id === trade.offered_card_id
        )
        setMySelected(offeredCard || null)
        setTheirSelected(requestedCard || null)
      }
    } catch (err) {
      setError('Failed to load trade data. Please go back and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!pendingTrade) return
    setSubmitting(true)
    const { error: err } = await supabase.rpc('accept_trade', { trade_id: pendingTrade.id })
    setSubmitting(false)
    if (err) {
      setError('Failed to accept trade: ' + err.message)
      return
    }
    navigate(-1)
  }

  async function handleReject() {
    if (!pendingTrade) return
    setSubmitting(true)
    const { error: err } = await supabase
      .from('trades')
      .update({ status: 'rejected' })
      .eq('id', pendingTrade.id)
    setSubmitting(false)
    if (err) {
      setError('Failed to reject trade: ' + err.message)
      return
    }
    navigate(-1)
  }

  async function handleOfferTrade() {
    if (!mySelected || !theirSelected) return
    setSubmitting(true)
    const { error: err } = await supabase.from('trades').insert({
      proposer_id: userId,
      receiver_id: friendId,
      offered_card_id: mySelected.id,
      requested_card_id: theirSelected.id,
      status: 'pending',
    })
    setSubmitting(false)
    if (err) {
      setError('Failed to send trade offer: ' + err.message)
      return
    }
    setSuccessMsg('Trade offer sent!')
    setTimeout(() => navigate(-1), 1500)
  }

  const isReceiverOfPendingTrade = pendingTrade && pendingTrade.proposer_id === friendId
  const isProposerOfPendingTrade = pendingTrade && pendingTrade.proposer_id === userId

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Card selection modal */}
      {modal && (
        <CardModal
          cards={modal === 'mine' ? myCards : theirCards}
          title={modal === 'mine' ? 'Your Cards' : `${friend?.username || 'Their'}'s Cards`}
          onSelect={(card) => {
            if (modal === 'mine') setMySelected(card)
            else setTheirSelected(card)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 style={styles.heading}>
            Trade with {friend?.username || '...'}
          </h1>
        </div>

        {error && <p style={styles.errorBanner}>{error}</p>}
        {successMsg && <p style={styles.successBanner}>{successMsg}</p>}

        {/* Pending trade notice */}
        {isProposerOfPendingTrade && (
          <div style={styles.pendingNotice}>
            Waiting for {friend?.username} to respond to your offer.
          </div>
        )}

        {/* Trade slots */}
        <div style={styles.slotsRow}>
          {/* My slot */}
          <div style={styles.slotColumn}>
            <p style={styles.slotLabel}>Your Card</p>
            {mySelected ? (
              <div
                style={isReceiverOfPendingTrade ? {} : styles.cardClickable}
                onClick={
                  isReceiverOfPendingTrade || isProposerOfPendingTrade
                    ? undefined
                    : () => setModal('mine')
                }
              >
                <PlayerCard {...toPlayerCardProps(mySelected)} />
              </div>
            ) : (
              <SlotPlaceholder
                onClick={
                  isReceiverOfPendingTrade || isProposerOfPendingTrade
                    ? undefined
                    : () => setModal('mine')
                }
                disabled={isReceiverOfPendingTrade || isProposerOfPendingTrade}
              />
            )}
          </div>

          {/* Arrow */}
          <div style={styles.arrowWrap}>
            <span style={styles.arrow}>⟷</span>
          </div>

          {/* Their slot */}
          <div style={styles.slotColumn}>
            <p style={styles.slotLabel}>{friend?.username || 'Their'} Card</p>
            {theirSelected ? (
              <div
                style={isReceiverOfPendingTrade ? {} : styles.cardClickable}
                onClick={
                  isReceiverOfPendingTrade || isProposerOfPendingTrade
                    ? undefined
                    : () => setModal('theirs')
                }
              >
                <PlayerCard {...toPlayerCardProps(theirSelected)} />
              </div>
            ) : (
              <SlotPlaceholder
                onClick={
                  isReceiverOfPendingTrade || isProposerOfPendingTrade
                    ? undefined
                    : () => setModal('theirs')
                }
                disabled={isReceiverOfPendingTrade || isProposerOfPendingTrade}
              />
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isReceiverOfPendingTrade && (
          <div style={styles.actionRow}>
            <button
              style={{ ...styles.primaryBtn, opacity: submitting ? 0.6 : 1 }}
              onClick={handleAccept}
              disabled={submitting}
            >
              {submitting ? '...' : 'Accept Trade'}
            </button>
            <button
              style={{ ...styles.secondaryBtn, opacity: submitting ? 0.6 : 1 }}
              onClick={handleReject}
              disabled={submitting}
            >
              Reject
            </button>
          </div>
        )}

        {!pendingTrade && (
          <div style={styles.actionRow}>
            <button
              style={{
                ...styles.primaryBtn,
                opacity: mySelected && theirSelected && !submitting ? 1 : 0.4,
              }}
              onClick={handleOfferTrade}
              disabled={!mySelected || !theirSelected || submitting}
            >
              {submitting ? 'Sending...' : 'Offer Trade'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function SlotPlaceholder({ onClick, disabled }) {
  return (
    <button
      style={{
        ...styles.slotPlaceholder,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span style={styles.plusSign}>+</span>
      {!disabled && <span style={styles.slotHint}>Tap to pick</span>}
    </button>
  )
}

function CardModal({ cards, title, onSelect, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modalSheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button style={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        {cards.length === 0 ? (
          <p style={styles.modalEmpty}>No cards available.</p>
        ) : (
          <div style={styles.modalGrid}>
            {cards.map((card) => {
              const props = toPlayerCardProps(card)
              if (!props) return null
              return (
                <button
                  key={card.id}
                  style={styles.modalCardBtn}
                  onClick={() => onSelect(card)}
                >
                  <PlayerCard {...props} size="small" />
                  <span style={styles.modalCardName}>
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

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FAF3E0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Fredoka One', cursive",
  },
  content: {
    flex: 1,
    padding: '16px 16px 100px',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  loadingWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    color: '#8B4513',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  backBtn: {
    backgroundColor: 'transparent',
    border: '2px solid #8B4513',
    borderRadius: '10px',
    color: '#8B4513',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '15px',
    padding: '8px 14px',
    minHeight: '44px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  heading: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '22px',
    color: '#3B1A08',
    margin: 0,
    lineHeight: 1.2,
  },
  errorBanner: {
    backgroundColor: '#FDDEDE',
    color: '#B00020',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '16px',
    fontFamily: 'system-ui, sans-serif',
  },
  successBanner: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '16px',
    marginBottom: '16px',
    fontFamily: "'Fredoka One', cursive",
    textAlign: 'center',
  },
  pendingNotice: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '16px',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
  },
  slotsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  slotColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  slotLabel: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '14px',
    color: '#5A2D0C',
    marginBottom: '8px',
    textAlign: 'center',
  },
  slotPlaceholder: {
    width: '100px',
    height: '140px',
    border: '3px dashed #C8A97A',
    borderRadius: '14px',
    backgroundColor: '#FFF8EC',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    boxSizing: 'border-box',
  },
  plusSign: {
    fontSize: '28px',
    color: '#C8A97A',
    fontFamily: "'Fredoka One', cursive",
    lineHeight: 1,
  },
  slotHint: {
    fontSize: '11px',
    color: '#A07850',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
  },
  cardClickable: {
    cursor: 'pointer',
  },
  arrowWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '60px',
    flexShrink: 0,
    width: '32px',
  },
  arrow: {
    fontSize: '22px',
    color: '#8B4513',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#8B4513',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 28px',
    minHeight: '48px',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '17px',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '220px',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#8B4513',
    border: '2px solid #8B4513',
    borderRadius: '14px',
    padding: '12px 28px',
    minHeight: '48px',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '17px',
    cursor: 'pointer',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF3E0',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 10px',
    borderBottom: '2px solid #E8D5B5',
    flexShrink: 0,
  },
  modalTitle: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '20px',
    color: '#3B1A08',
    margin: 0,
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: '#8B4513',
    cursor: 'pointer',
    padding: '4px 8px',
    minHeight: '44px',
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '16px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  modalCardBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '6px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  modalCardName: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '11px',
    color: '#3B1A08',
    textAlign: 'center',
    lineHeight: 1.2,
    wordBreak: 'break-word',
  },
  modalEmpty: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '15px',
    color: '#8B6A4E',
    textAlign: 'center',
    padding: '32px 16px',
  },
}
