import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard } from '../components/Card/PlayerCard'
import { BottomNav } from '../components/Nav/BottomNav'
import { CompeteSection } from '../components/Compete/CompeteSection'

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
    teamTextColor: p.team?.text_color ?? '#FFFFFF',
    teamLogo: p.team?.logo_url ?? null,
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
  const [pendingTrade, setPendingTrade] = useState(null)
  const [myCardCount, setMyCardCount] = useState(0)
  const [friendCardCount, setFriendCardCount] = useState(0)

  const [mySelected, setMySelected] = useState(null)
  const [theirSelected, setTheirSelected] = useState(null)

  // modal: null | 'mine' | 'theirs'
  const [modal, setModal] = useState(null)
  // card tapped for large view when trade received
  const [cardPreview, setCardPreview] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

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
          .select('id, rating, player:players(*, team:teams!players_team_id_fkey(name,primary_color,text_color,logo_url))')
          .eq('user_id', userId),
        supabase
          .from('user_cards')
          .select('id, rating, player:players(*, team:teams!players_team_id_fkey(name,primary_color,text_color,logo_url))')
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

      const myCardsData = myCardsRes.data || []
      const theirCardsData = theirCardsRes.data || []
      setMyCards(myCardsData)
      setTheirCards(theirCardsData)
      setMyCardCount(myCardsData.length)
      setFriendCardCount(theirCardsData.length)

      const trade = tradeRes.data || null
      setPendingTrade(trade)

      if (trade && trade.proposer_id === friendId) {
        const allCards = [...myCardsData, ...theirCardsData]
        setMySelected(allCards.find((c) => c.id === trade.requested_card_id) || null)
        setTheirSelected(allCards.find((c) => c.id === trade.offered_card_id) || null)
      } else if (trade && trade.proposer_id === userId) {
        const allCards = [...myCardsData, ...theirCardsData]
        setMySelected(allCards.find((c) => c.id === trade.offered_card_id) || null)
        setTheirSelected(allCards.find((c) => c.id === trade.requested_card_id) || null)
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
    if (err) { setError('Failed to accept trade: ' + err.message); return }
    // Get the player id of the card we just received (the proposer's offered card)
    const { data: cardData } = await supabase
      .from('user_cards')
      .select('player_id')
      .eq('id', pendingTrade.offered_card_id)
      .single()
    if (cardData?.player_id) {
      navigate(`/collection?newCard=${cardData.player_id}`)
    } else {
      navigate('/collection')
    }
  }

  async function handleReject() {
    if (!pendingTrade) return
    setSubmitting(true)
    const { error: err } = await supabase.from('trades').update({ status: 'rejected' }).eq('id', pendingTrade.id)
    setSubmitting(false)
    if (err) { setError('Failed to reject trade: ' + err.message); return }
    navigate(-1)
  }

  async function handleCancel() {
    if (!pendingTrade) return
    setSubmitting(true)
    const { error: err } = await supabase.from('trades').delete().eq('id', pendingTrade.id)
    setSubmitting(false)
    if (err) { setError('Failed to cancel trade: ' + err.message); return }
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
    if (err) { setError('Failed to send trade offer: ' + err.message); return }
    setSuccessMsg('Trade Sent!')
    setTimeout(() => navigate(-1), 1800)
  }

  const isReceiverOfPendingTrade = pendingTrade && pendingTrade.proposer_id === friendId
  const isProposerOfPendingTrade = pendingTrade && pendingTrade.proposer_id === userId
  const friendName = friend?.username || 'Their'

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}><p style={styles.loadingText}>Loading...</p></div>
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
          title={modal === 'mine' ? 'Your Cards' : `${friendName}'s Cards`}
          onSelect={(card) => {
            if (modal === 'mine') setMySelected(card)
            else setTheirSelected(card)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Full-size card preview (tap on received trade card) */}
      {cardPreview && (
        <div style={styles.previewOverlay} onClick={() => setCardPreview(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <PlayerCard
              {...toPlayerCardProps(cardPreview)}
              size="full"
              rating={cardPreview.rating ?? null}
            />
          </div>
        </div>
      )}

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <h1 style={styles.heading}>Trade with {friendName}</h1>
        </div>

        {error && <p style={styles.errorBanner}>{error}</p>}
        {successMsg && <p style={styles.successBanner}>{successMsg}</p>}

        {isProposerOfPendingTrade && (
          <div style={styles.pendingNotice}>
            Waiting for {friendName} to respond to your offer.
          </div>
        )}

        {/* Trade slots */}
        <div style={styles.slotsRow}>
          {/* My slot */}
          <div style={styles.slotColumn}>
            <p style={styles.slotLabel}>Your Card</p>
            {mySelected ? (
              <div
                style={styles.cardClickable}
                onClick={
                  isReceiverOfPendingTrade
                    ? () => setCardPreview(mySelected)
                    : isProposerOfPendingTrade
                    ? () => setCardPreview(mySelected)
                    : () => setModal('mine')
                }
              >
                <PlayerCard {...toPlayerCardProps(mySelected)} rating={mySelected.rating ?? null} />
              </div>
            ) : (
              <SlotPlaceholder
                onClick={isReceiverOfPendingTrade || isProposerOfPendingTrade ? undefined : () => setModal('mine')}
                disabled={isReceiverOfPendingTrade || isProposerOfPendingTrade}
              />
            )}
          </div>

          <div style={styles.arrowWrap}><span style={styles.arrow}>⟷</span></div>

          {/* Their slot */}
          <div style={styles.slotColumn}>
            <p style={styles.slotLabel}>{friendName}'s Card</p>
            {theirSelected ? (
              <div
                style={styles.cardClickable}
                onClick={
                  isReceiverOfPendingTrade
                    ? () => setCardPreview(theirSelected)
                    : isProposerOfPendingTrade
                    ? () => setCardPreview(theirSelected)
                    : () => setModal('theirs')
                }
              >
                <PlayerCard {...toPlayerCardProps(theirSelected)} rating={theirSelected.rating ?? null} />
              </div>
            ) : (
              <SlotPlaceholder
                onClick={isReceiverOfPendingTrade || isProposerOfPendingTrade ? undefined : () => setModal('theirs')}
                disabled={isReceiverOfPendingTrade || isProposerOfPendingTrade}
              />
            )}
          </div>
        </div>

        {/* Accept/Reject (receiver) */}
        {isReceiverOfPendingTrade && (
          <div style={styles.actionRow}>
            <button style={{ ...styles.primaryBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleAccept} disabled={submitting}>
              {submitting ? '...' : 'Accept Trade'}
            </button>
            <button style={{ ...styles.secondaryBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleReject} disabled={submitting}>
              Reject
            </button>
          </div>
        )}

        {/* Cancel (proposer) */}
        {isProposerOfPendingTrade && (
          <div style={styles.actionRow}>
            <button style={{ ...styles.secondaryBtn, opacity: submitting ? 0.6 : 1 }} onClick={handleCancel} disabled={submitting}>
              {submitting ? '...' : 'Cancel Trade'}
            </button>
          </div>
        )}

        {/* Offer Trade (no pending trade) */}
        {!pendingTrade && (
          <div style={styles.actionRow}>
            <button
              style={{ ...styles.primaryBtn, opacity: mySelected && theirSelected && !submitting ? 1 : 0.4 }}
              onClick={handleOfferTrade}
              disabled={!mySelected || !theirSelected || submitting}
            >
              {submitting ? 'Sending...' : 'Offer Trade'}
            </button>
          </div>
        )}

        {/* Battle / Compete section */}
        {userId && friendId && (
          <>
            <div style={{ height: '2px', backgroundColor: '#E8D5B0', margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 0 8px' }}>
              <span style={{ fontSize: '18px' }}>⚔️</span>
              <span style={{ fontFamily: 'Arial', fontWeight: 800, fontSize: '18px', color: '#8B4513' }}>BATTLE</span>
            </div>
            <CompeteSection
              friendId={friendId}
              friendName={friendName}
              myCardCount={myCardCount}
              friendCardCount={friendCardCount}
              userId={userId}
            />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function SlotPlaceholder({ onClick, disabled }) {
  return (
    <button
      style={{ ...styles.slotPlaceholder, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span style={styles.plusSign}>+</span>
      {!disabled && <span style={styles.slotHint}>Tap to pick</span>}
    </button>
  )
}

// CardModal with confirm/back flow
function CardModal({ cards, title, onSelect, onClose }) {
  const [preview, setPreview] = useState(null) // card being previewed

  if (preview) {
    const props = toPlayerCardProps(preview)
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
          <div style={styles.previewCard}>
            <PlayerCard {...props} size="full" rating={preview.rating ?? null} />
          </div>
          <div style={styles.previewButtons}>
            <button style={styles.confirmBtn} onClick={() => { onSelect(preview); setPreview(null) }}>
              Confirm
            </button>
            <button style={styles.backBtnModal} onClick={() => setPreview(null)}>
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {cards.length === 0 ? (
          <p style={styles.modalEmpty}>No cards available.</p>
        ) : (
          <div style={styles.modalGrid}>
            {cards.map((card) => {
              const props = toPlayerCardProps(card)
              if (!props) return null
              return (
                <button key={card.id} style={styles.modalCardBtn} onClick={() => setPreview(card)}>
                  <PlayerCard {...props} size="small" rating={card.rating ?? null} />
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
    fontFamily: 'Arial, sans-serif', fontWeight: 700,
  },
  content: { flex: 1, padding: '16px 16px 100px', maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  loadingWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '18px', color: '#8B4513' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  backBtn: { backgroundColor: 'transparent', border: '2px solid #8B4513', borderRadius: '10px', color: '#8B4513', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px', padding: '8px 14px', minHeight: '44px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  heading: { fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '22px', color: '#3B1A08', margin: 0, lineHeight: 1.2 },
  errorBanner: { backgroundColor: '#FDDEDE', color: '#B00020', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', marginBottom: '16px', fontFamily: 'Arial, sans-serif', fontWeight: 700 },
  successBanner: { backgroundColor: 'transparent', color: '#CC0000', borderRadius: '10px', padding: '10px 14px', fontSize: '20px', marginBottom: '16px', fontFamily: 'Arial, sans-serif', fontWeight: 800, textAlign: 'center' },
  pendingNotice: { backgroundColor: '#FFF3CD', color: '#856404', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', marginBottom: '16px', fontFamily: 'Arial, sans-serif', fontWeight: 700, textAlign: 'center' },
  slotsRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '8px', marginBottom: '24px' },
  slotColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 },
  slotLabel: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '14px', color: '#5A2D0C', marginBottom: '8px', textAlign: 'center' },
  slotPlaceholder: { width: '100px', height: '140px', border: '3px dashed #C8A97A', borderRadius: '14px', backgroundColor: '#FFF8EC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxSizing: 'border-box' },
  plusSign: { fontSize: '28px', color: '#C8A97A', fontFamily: 'Arial, sans-serif', fontWeight: 700, lineHeight: 1 },
  slotHint: { fontSize: '11px', color: '#A07850', fontFamily: 'Arial, sans-serif', fontWeight: 700, textAlign: 'center' },
  cardClickable: { cursor: 'pointer' },
  arrowWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', flexShrink: 0, width: '32px' },
  arrow: { fontSize: '22px', color: '#8B4513' },
  actionRow: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' },
  primaryBtn: { backgroundColor: '#8B4513', color: '#FFFFFF', border: 'none', borderRadius: '14px', padding: '12px 28px', minHeight: '48px', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '17px', cursor: 'pointer', flex: 1, maxWidth: '220px' },
  secondaryBtn: { backgroundColor: 'transparent', color: '#8B4513', border: '2px solid #8B4513', borderRadius: '14px', padding: '12px 28px', minHeight: '48px', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '17px', cursor: 'pointer' },
  // Card preview overlay (tap on received trade card)
  previewOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  // Modal
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  modalSheet: { backgroundColor: '#FAF3E0', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 10px', borderBottom: '2px solid #E8D5B5', flexShrink: 0 },
  modalTitle: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '20px', color: '#3B1A08', margin: 0 },
  modalClose: { backgroundColor: 'transparent', border: 'none', fontSize: '20px', color: '#8B4513', cursor: 'pointer', padding: '4px 8px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  modalCardBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: '2px solid transparent', borderRadius: '12px', padding: '6px', cursor: 'pointer', boxSizing: 'border-box' },
  modalCardName: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '11px', color: '#3B1A08', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' },
  modalEmpty: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px', color: '#8B6A4E', textAlign: 'center', padding: '32px 16px' },
  // Confirm/back preview inside modal
  previewCard: { display: 'flex', justifyContent: 'center', padding: '24px 16px 16px', overflowY: 'auto' },
  previewButtons: { display: 'flex', gap: '12px', padding: '0 24px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', flexShrink: 0 },
  confirmBtn: { flex: 1, backgroundColor: '#8B4513', color: '#FFF', border: 'none', borderRadius: '14px', padding: '14px', minHeight: '50px', fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px', cursor: 'pointer', boxShadow: '0 3px 0 #5C2A00' },
  backBtnModal: { flex: 1, backgroundColor: 'transparent', color: '#8B4513', border: '2px solid #8B4513', borderRadius: '14px', padding: '14px', minHeight: '50px', fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px', cursor: 'pointer' },
}
