import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OnboardingModal } from '../components/Onboarding/OnboardingModal'

const BATTLE_INFO_STEPS = [
  {
    icon: '⚔️',
    heading: 'Best of 3 Rounds',
    body: 'Each battle is a best-of-3 series. Pick 5 cards per round — highest combined rating wins the round.',
  },
  {
    icon: '⚡',
    heading: 'Lock-Ins',
    body: 'You start with 3 Lock-Ins. Use them to hand-pick specific cards; empty slots are filled randomly.',
  },
  {
    icon: '📈',
    heading: 'ELO Rating',
    body: 'Win battles to climb the leaderboard. Your ELO goes up with wins and down with losses.',
  },
]

export function FriendsPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [showBattleInfo, setShowBattleInfo] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [pendingTradeProposers, setPendingTradeProposers] = useState(new Set())
  const [sentTradeReceivers, setSentTradeReceivers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addUsername, setAddUsername] = useState('')
  const [addStatus, setAddStatus] = useState(null)
  const [addError, setAddError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [showSent, setShowSent] = useState(false)
  const [openMenu, setOpenMenu] = useState(null) // req.id of open three-dot menu

  useEffect(() => {
    const raw = localStorage.getItem('scc_user')
    if (!raw) { navigate('/login'); return }
    const parsed = JSON.parse(raw)
    if (!parsed?.id) { navigate('/login'); return }
    setUserId(parsed.id)
  }, [navigate])

  useEffect(() => {
    if (!userId) return
    fetchAll()
  }, [userId])

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return
    function handleClick() { setOpenMenu(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenu])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests(), fetchPendingTrades(), fetchSentTrades()])
    } catch {
      setError('Failed to load friends. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchFriends() {
    const { data, error: err } = await supabase
      .from('friendships')
      .select('*, requester:users!requester_id(id,username), addressee:users!addressee_id(id,username)')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
    if (err) throw err
    setFriends((data || []).map((f) => {
      const friend = f.requester_id === userId ? f.addressee : f.requester
      return { friendshipId: f.id, ...friend }
    }))
  }

  async function fetchPendingRequests() {
    const { data, error: err } = await supabase
      .from('friendships')
      .select('*, requester:users!requester_id(id,username)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    if (err) throw err
    setPendingRequests(data || [])
  }

  async function fetchSentRequests() {
    const { data, error: err } = await supabase
      .from('friendships')
      .select('*, addressee:users!addressee_id(id,username)')
      .eq('requester_id', userId)
      .eq('status', 'pending')
    if (err) throw err
    setSentRequests(data || [])
  }

  async function fetchPendingTrades() {
    const { data, error: err } = await supabase
      .from('trades')
      .select('proposer_id')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
    if (err) throw err
    setPendingTradeProposers(new Set((data || []).map((t) => t.proposer_id)))
  }

  async function fetchSentTrades() {
    const { data, error: err } = await supabase
      .from('trades')
      .select('receiver_id')
      .eq('proposer_id', userId)
      .eq('status', 'pending')
    if (err) throw err
    setSentTradeReceivers(new Set((data || []).map((t) => t.receiver_id)))
  }

  async function handleAccept(friendshipId) {
    setActionLoading(friendshipId)
    const { error: err } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    setActionLoading(null)
    if (err) { setError('Could not accept request.'); return }
    if (!localStorage.getItem('scc_battle_info_seen')) setShowBattleInfo(true)
    await fetchAll()
  }

  async function handleReject(friendshipId) {
    setActionLoading(friendshipId)
    const { error: err } = await supabase.from('friendships').update({ status: 'rejected' }).eq('id', friendshipId)
    setActionLoading(null)
    if (err) { setError('Could not reject request.'); return }
    await fetchAll()
  }

  async function handleDeleteSentRequest(friendshipId) {
    setActionLoading(friendshipId)
    const { error: err } = await supabase.from('friendships').delete().eq('id', friendshipId)
    setActionLoading(null)
    setOpenMenu(null)
    if (err) { setError('Could not delete request.'); return }
    await fetchAll()
  }

  async function handleAddFriend(e) {
    e.preventDefault()
    const trimmed = addUsername.trim()
    if (!trimmed) return
    setAddStatus('loading')
    setAddError('')

    const me = JSON.parse(localStorage.getItem('scc_user'))
    if (me?.username?.toLowerCase() === trimmed.toLowerCase()) {
      setAddStatus('error'); setAddError("You can't add yourself!"); return
    }

    const { data: found, error: findErr } = await supabase
      .from('users').select('id, username').ilike('username', trimmed).single()
    if (findErr || !found) {
      setAddStatus('error'); setAddError('User not found. Check the username and try again.'); return
    }
    if (found.id === userId) {
      setAddStatus('error'); setAddError("You can't add yourself!"); return
    }

    const { data: existing } = await supabase
      .from('friendships').select('id, status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${found.id}),and(requester_id.eq.${found.id},addressee_id.eq.${userId})`)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        setAddStatus('error'); setAddError('You are already friends with this person.'); return
      } else if (existing.status === 'pending') {
        setAddStatus('error'); setAddError('A friend request already exists with this person.'); return
      } else {
        const { error: updateErr } = await supabase
          .from('friendships').update({ status: 'pending', requester_id: userId, addressee_id: found.id }).eq('id', existing.id)
        if (updateErr) { setAddStatus('error'); setAddError('Failed to send request. Try again.'); return }
        setAddStatus('success'); setAddUsername(''); await fetchAll(); return
      }
    }

    const { error: insertErr } = await supabase.from('friendships').insert({ requester_id: userId, addressee_id: found.id, status: 'pending' })
    if (insertErr) { setAddStatus('error'); setAddError('Failed to send request. Try again.'); return }
    setAddStatus('success'); setAddUsername('')
    if (!localStorage.getItem('scc_battle_info_seen')) setShowBattleInfo(true)
    await fetchAll()
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.loadingWrap}><p style={s.loadingText}>Loading friends...</p></div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {showBattleInfo && (
        <OnboardingModal
          title="How Battles Work"
          steps={BATTLE_INFO_STEPS}
          onDone={() => {
            localStorage.setItem('scc_battle_info_seen', '1')
            setShowBattleInfo(false)
          }}
        />
      )}
      <div style={s.content}>
        <h1 style={s.heading}>Friends</h1>
        {error && <p style={s.errorBanner}>{error}</p>}

        {/* ── Add Friend ── */}
        <section style={s.section}>
          <h2 style={s.subheading}>Add Friend</h2>
          <form onSubmit={handleAddFriend} style={s.addForm}>
            <input
              style={s.addInput}
              type="text"
              placeholder="Enter username..."
              value={addUsername}
              onChange={(e) => { setAddUsername(e.target.value); setAddStatus(null); setAddError('') }}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              style={{ ...s.addBtn, opacity: addStatus === 'loading' ? 0.6 : 1 }}
              type="submit"
              disabled={addStatus === 'loading' || !addUsername.trim()}
            >
              {addStatus === 'loading' ? 'Sending...' : 'Send Request'}
            </button>
          </form>
          {addStatus === 'error' && <p style={s.addError}>{addError}</p>}
          {addStatus === 'success' && <p style={s.addSuccess}>Friend request sent! ✓</p>}
        </section>

        {/* ── Friends grid ── */}
        <section style={s.section}>
          <h2 style={s.subheading}>My Friends</h2>
          {friends.length === 0 ? (
            <p style={s.emptyState}>No friends yet — add someone above!</p>
          ) : (
            <div style={s.friendsGrid}>
              {friends.map((friend) => (
                <button key={friend.id} style={s.friendTile} onClick={() => navigate('/trade/' + friend.id)}>
                  <div style={s.avatar}>{friend.username?.[0]?.toUpperCase() || '?'}</div>
                  <span style={s.friendUsername}>{friend.username}</span>
                  {pendingTradeProposers.has(friend.id) && (
                    <span style={s.tradeBadge}>Trade Offer!</span>
                  )}
                  {!pendingTradeProposers.has(friend.id) && sentTradeReceivers.has(friend.id) && (
                    <span style={s.tradeSentBadge}>Trade Sent!</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Incoming requests ── */}
        {pendingRequests.length > 0 && (
          <section style={s.section}>
            <h2 style={s.subheading}>Requests Received</h2>
            <div style={s.requestList}>
              {pendingRequests.map((req) => (
                <div key={req.id} style={s.requestTile}>
                  <div style={s.requestAvatar}>{req.requester?.username?.[0]?.toUpperCase() || '?'}</div>
                  <span style={s.requestUsername}>{req.requester?.username}</span>
                  <div style={s.requestActions}>
                    <button style={s.acceptBtn} disabled={actionLoading === req.id} onClick={() => handleAccept(req.id)}>
                      {actionLoading === req.id ? '...' : 'Accept'}
                    </button>
                    <button style={s.rejectBtn} disabled={actionLoading === req.id} onClick={() => handleReject(req.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Requests Sent ── */}
        <section style={s.section}>
          <button style={s.sentToggleBtn} onClick={() => setShowSent((v) => !v)}>
            Requests Sent {sentRequests.length > 0 ? `(${sentRequests.length})` : ''} {showSent ? '▲' : '▼'}
          </button>
          {showSent && (
            <div style={{ marginTop: 10 }}>
              {sentRequests.length === 0 ? (
                <p style={s.emptyState}>No pending sent requests.</p>
              ) : (
                <div style={s.requestList}>
                  {sentRequests.map((req) => (
                    <div key={req.id} style={s.requestTile}>
                      <div style={s.requestAvatar}>{req.addressee?.username?.[0]?.toUpperCase() || '?'}</div>
                      <span style={s.requestUsername}>{req.addressee?.username}</span>
                      <span style={s.pendingLabel}>Pending...</span>
                      {/* Three-dot menu */}
                      <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={s.dotsBtn}
                          onClick={() => setOpenMenu(openMenu === req.id ? null : req.id)}
                          aria-label="Options"
                        >
                          ⋮
                        </button>
                        {openMenu === req.id && (
                          <div style={s.dropdown}>
                            <button
                              style={s.dropdownItem}
                              onClick={() => handleDeleteSentRequest(req.id)}
                              disabled={actionLoading === req.id}
                            >
                              {actionLoading === req.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100%',
    backgroundColor: '#FAF3E0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
  },
  content: {
    flex: 1,
    padding: '20px 16px 100px',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  heading: { fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 28, color: '#3B1A08', margin: '0 0 20px' },
  subheading: { fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 18, color: '#5A2D0C', margin: '0 0 12px' },
  section: { marginBottom: 28 },
  loadingWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 18, color: '#8B4513' },
  errorBanner: { backgroundColor: '#FDDEDE', color: '#B00020', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 16, fontWeight: 700 },
  requestList: { display: 'flex', flexDirection: 'column', gap: 10 },
  requestTile: {
    display: 'flex', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF8EC', borderRadius: 14, padding: '12px 14px',
    border: '2px solid #E8D5B5', boxSizing: 'border-box',
  },
  requestAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    backgroundColor: '#8B4513', color: '#FFF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 18, flexShrink: 0,
  },
  requestUsername: { flex: 1, fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#3B1A08', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  requestActions: { display: 'flex', gap: 8, flexShrink: 0 },
  acceptBtn: { backgroundColor: '#8B4513', color: '#FFF', border: 'none', borderRadius: 10, padding: '8px 14px', minHeight: 44, fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },
  rejectBtn: { backgroundColor: 'transparent', color: '#8B4513', border: '2px solid #8B4513', borderRadius: 10, padding: '8px 14px', minHeight: 44, fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },
  pendingLabel: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, color: '#A07850', fontStyle: 'italic', flexShrink: 0 },
  dotsBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 22, color: '#8B4513', padding: '4px 8px',
    minHeight: 44, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute', right: 0, top: '100%', zIndex: 50,
    backgroundColor: '#FFF', border: '2px solid #E8D5B5',
    borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    minWidth: 100, overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block', width: '100%', padding: '12px 16px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 15,
    color: '#CC0000', textAlign: 'left',
  },
  friendsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  friendTile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8EC', borderRadius: 16, padding: '18px 12px',
    border: '2px solid #E8D5B5', cursor: 'pointer', boxSizing: 'border-box',
    minHeight: 44, position: 'relative', fontFamily: 'Arial, sans-serif',
    boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
  },
  avatar: { width: 52, height: 52, borderRadius: '50%', backgroundColor: '#8B4513', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 22 },
  friendUsername: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 15, color: '#3B1A08', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' },
  tradeBadge: { backgroundColor: '#CC0000', color: '#FFF', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: 700, whiteSpace: 'nowrap' },
  tradeSentBadge: { backgroundColor: '#CC0000', color: '#FFF', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: 700, whiteSpace: 'nowrap' },
  emptyState: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 15, color: '#8B6A4E', textAlign: 'center', padding: '24px 0' },
  addForm: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  addInput: { flex: '1 1 180px', border: '2px solid #C8A97A', borderRadius: 12, padding: '10px 14px', fontSize: 16, fontFamily: 'Arial, sans-serif', fontWeight: 700, backgroundColor: '#FFF8EC', color: '#3B1A08', minHeight: 44, boxSizing: 'border-box', outline: 'none' },
  addBtn: { backgroundColor: '#8B4513', color: '#FFF', border: 'none', borderRadius: 12, padding: '10px 18px', minHeight: 44, fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  addError: { color: '#B00020', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 14, marginTop: 8 },
  addSuccess: { color: '#2E7D32', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 14, marginTop: 8 },
  sentToggleBtn: {
    backgroundColor: '#FFF8EC', color: '#8B4513', border: '2px solid #8B4513',
    borderRadius: 12, padding: '10px 18px', minHeight: 44, width: '100%',
    fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer',
    textAlign: 'left',
  },
}
