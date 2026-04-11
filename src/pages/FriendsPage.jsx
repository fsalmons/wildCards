import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BottomNav } from '../components/Nav/BottomNav'

export function FriendsPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [pendingTradeProposers, setPendingTradeProposers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addUsername, setAddUsername] = useState('')
  const [addStatus, setAddStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [addError, setAddError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // friendship id being acted on

  useEffect(() => {
    const raw = localStorage.getItem('scc_user')
    if (!raw) {
      navigate('/login')
      return
    }
    const parsed = JSON.parse(raw)
    if (!parsed?.id) {
      navigate('/login')
      return
    }
    setUserId(parsed.id)
  }, [navigate])

  useEffect(() => {
    if (!userId) return
    fetchAll()
  }, [userId])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchFriends(), fetchPendingRequests(), fetchPendingTrades()])
    } catch (err) {
      setError('Failed to load friends. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchFriends() {
    const { data, error: err } = await supabase
      .from('friendships')
      .select(
        '*, requester:users!requester_id(id,username), addressee:users!addressee_id(id,username)'
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
    if (err) throw err
    const friendList = (data || []).map((f) => {
      const friend = f.requester_id === userId ? f.addressee : f.requester
      return { friendshipId: f.id, ...friend }
    })
    setFriends(friendList)
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

  async function fetchPendingTrades() {
    const { data, error: err } = await supabase
      .from('trades')
      .select('proposer_id')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
    if (err) throw err
    const ids = new Set((data || []).map((t) => t.proposer_id))
    setPendingTradeProposers(ids)
  }

  async function handleAccept(friendshipId) {
    setActionLoading(friendshipId)
    const { error: err } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    setActionLoading(null)
    if (err) {
      setError('Could not accept request.')
      return
    }
    await fetchAll()
  }

  async function handleReject(friendshipId) {
    setActionLoading(friendshipId)
    const { error: err } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', friendshipId)
    setActionLoading(null)
    if (err) {
      setError('Could not reject request.')
      return
    }
    await fetchAll()
  }

  async function handleAddFriend(e) {
    e.preventDefault()
    const trimmed = addUsername.trim()
    if (!trimmed) return

    setAddStatus('loading')
    setAddError('')

    // Check if trying to add self
    const raw = localStorage.getItem('scc_user')
    const me = JSON.parse(raw)
    if (me?.username && me.username.toLowerCase() === trimmed.toLowerCase()) {
      setAddStatus('error')
      setAddError("You can't add yourself!")
      return
    }

    // Look up user by username
    const { data: found, error: findErr } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', trimmed)
      .single()

    if (findErr || !found) {
      setAddStatus('error')
      setAddError('User not found. Check the username and try again.')
      return
    }

    if (found.id === userId) {
      setAddStatus('error')
      setAddError("You can't add yourself!")
      return
    }

    // Check if friendship already exists in any state
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${found.id}),and(requester_id.eq.${found.id},addressee_id.eq.${userId})`
      )
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        setAddStatus('error')
        setAddError('You are already friends with this person.')
      } else if (existing.status === 'pending') {
        setAddStatus('error')
        setAddError('A friend request already exists with this person.')
      } else {
        // rejected — allow re-request by updating
        const { error: updateErr } = await supabase
          .from('friendships')
          .update({ status: 'pending', requester_id: userId, addressee_id: found.id })
          .eq('id', existing.id)
        if (updateErr) {
          setAddStatus('error')
          setAddError('Failed to send request. Try again.')
          return
        }
        setAddStatus('success')
        setAddUsername('')
      }
      return
    }

    // Insert new friendship
    const { error: insertErr } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: found.id,
      status: 'pending',
    })

    if (insertErr) {
      setAddStatus('error')
      setAddError('Failed to send request. Try again.')
      return
    }

    setAddStatus('success')
    setAddUsername('')
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <p style={styles.loadingText}>Loading friends...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.heading}>Friends</h1>

        {error && <p style={styles.errorBanner}>{error}</p>}

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.subheading}>Friend Requests</h2>
            <div style={styles.requestList}>
              {pendingRequests.map((req) => (
                <div key={req.id} style={styles.requestTile}>
                  <div style={styles.requestAvatar}>
                    {req.requester?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span style={styles.requestUsername}>{req.requester?.username}</span>
                  <div style={styles.requestActions}>
                    <button
                      style={styles.acceptBtn}
                      disabled={actionLoading === req.id}
                      onClick={() => handleAccept(req.id)}
                    >
                      {actionLoading === req.id ? '...' : 'Accept'}
                    </button>
                    <button
                      style={styles.rejectBtn}
                      disabled={actionLoading === req.id}
                      onClick={() => handleReject(req.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends grid */}
        <section style={styles.section}>
          {friends.length === 0 ? (
            <p style={styles.emptyState}>No friends yet — add someone by username!</p>
          ) : (
            <div style={styles.friendsGrid}>
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  style={styles.friendTile}
                  onClick={() => navigate('/trade/' + friend.id)}
                >
                  <div style={styles.avatar}>
                    {friend.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span style={styles.friendUsername}>{friend.username}</span>
                  {pendingTradeProposers.has(friend.id) && (
                    <span style={styles.tradeBadge}>Trade offer! 🔴</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Add Friend */}
        <section style={styles.section}>
          <h2 style={styles.subheading}>Add Friend</h2>
          <form onSubmit={handleAddFriend} style={styles.addForm}>
            <input
              style={styles.addInput}
              type="text"
              placeholder="Enter username..."
              value={addUsername}
              onChange={(e) => {
                setAddUsername(e.target.value)
                setAddStatus(null)
                setAddError('')
              }}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              style={{
                ...styles.addBtn,
                opacity: addStatus === 'loading' ? 0.6 : 1,
              }}
              type="submit"
              disabled={addStatus === 'loading' || !addUsername.trim()}
            >
              {addStatus === 'loading' ? 'Sending...' : 'Send Request'}
            </button>
          </form>
          {addStatus === 'error' && <p style={styles.addError}>{addError}</p>}
          {addStatus === 'success' && (
            <p style={styles.addSuccess}>Friend request sent!</p>
          )}
        </section>
      </div>

      <BottomNav />
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
    padding: '20px 16px 100px',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  heading: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '28px',
    color: '#3B1A08',
    margin: '0 0 20px',
  },
  subheading: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    color: '#5A2D0C',
    margin: '0 0 12px',
  },
  section: {
    marginBottom: '28px',
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
  errorBanner: {
    backgroundColor: '#FDDEDE',
    color: '#B00020',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '16px',
    fontFamily: 'system-ui, sans-serif',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  requestTile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#FFF8EC',
    borderRadius: '14px',
    padding: '12px 14px',
    border: '2px solid #E8D5B5',
    boxSizing: 'border-box',
  },
  requestAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#8B4513',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    flexShrink: 0,
  },
  requestUsername: {
    flex: 1,
    fontFamily: "'Fredoka One', cursive",
    fontSize: '16px',
    color: '#3B1A08',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  requestActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  acceptBtn: {
    backgroundColor: '#8B4513',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 14px',
    minHeight: '44px',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    color: '#8B4513',
    border: '2px solid #8B4513',
    borderRadius: '10px',
    padding: '8px 14px',
    minHeight: '44px',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  friendsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  friendTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFF8EC',
    borderRadius: '16px',
    padding: '18px 12px',
    border: '2px solid #E8D5B5',
    cursor: 'pointer',
    boxSizing: 'border-box',
    minHeight: '44px',
    position: 'relative',
    fontFamily: "'Fredoka One', cursive",
    boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
    transition: 'transform 0.1s',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#8B4513',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '22px',
  },
  friendUsername: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '15px',
    color: '#3B1A08',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  tradeBadge: {
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    borderRadius: '20px',
    padding: '3px 10px',
    fontSize: '12px',
    fontFamily: "'Fredoka One', cursive",
    whiteSpace: 'nowrap',
  },
  emptyState: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '15px',
    color: '#8B6A4E',
    textAlign: 'center',
    padding: '24px 0',
  },
  addForm: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  addInput: {
    flex: '1 1 180px',
    border: '2px solid #C8A97A',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '16px',
    fontFamily: 'system-ui, sans-serif',
    backgroundColor: '#FFF8EC',
    color: '#3B1A08',
    minHeight: '44px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  addBtn: {
    backgroundColor: '#8B4513',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 18px',
    minHeight: '44px',
    fontFamily: "'Fredoka One', cursive",
    fontSize: '15px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  addError: {
    color: '#B00020',
    fontSize: '14px',
    marginTop: '8px',
    fontFamily: 'system-ui, sans-serif',
  },
  addSuccess: {
    color: '#2E7D32',
    fontSize: '14px',
    marginTop: '8px',
    fontFamily: 'system-ui, sans-serif',
  },
}
