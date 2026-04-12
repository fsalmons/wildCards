import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { getCompetitionState, getAvailableCards } from '../../lib/competitionUtils'
import { CompeteRoundPicker } from './CompeteRoundPicker'
import { RoundResult } from './RoundResult'
import { SeriesComplete } from './SeriesComplete'

const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'
const MIN_CARDS = 15

function SeriesHeader({ competition, currentRound, userId }) {
  const isChallenger = competition.challenger_id === userId
  const myWins = isChallenger ? competition.challenger_wins : competition.opponent_wins
  const theirWins = isChallenger ? competition.opponent_wins : competition.challenger_wins
  const lockIns = isChallenger
    ? competition.challenger_lock_ins_remaining
    : competition.opponent_lock_ins_remaining

  return (
    <div style={{
      backgroundColor: CARD_BG, border: `2px solid ${BROWN}`, borderRadius: '12px',
      padding: '10px 14px', marginBottom: '16px', boxShadow: '0 2px 0 #5C2A00',
    }}>
      <div style={{
        fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '14px',
        color: '#3B1A08', textAlign: 'center', letterSpacing: '0.5px',
      }}>
        ⚔️ SERIES &nbsp;|&nbsp; Round {competition.current_round} of 3
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '6px', flexWrap: 'wrap', gap: '4px',
      }}>
        <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', color: BROWN }}>
          🔒 Lock-Ins: {lockIns} remaining
        </span>
        <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '14px', color: '#3B1A08' }}>
          You {myWins} — {theirWins} Them
        </span>
      </div>
    </div>
  )
}

export function CompeteSection({ friendId, friendName, myCardCount, friendCardCount, userId }) {
  const [competition, setCompetition] = useState(undefined) // undefined = loading, null = none
  const [currentRound, setCurrentRound] = useState(null)
  const [myUsedCardIds, setMyUsedCardIds] = useState([])
  const [myCards, setMyCards] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const pollRef = useRef(null)
  const visibleRef = useRef(true)

  const myDeficit = Math.max(0, MIN_CARDS - (myCardCount ?? 0))
  const friendDeficit = Math.max(0, MIN_CARDS - (friendCardCount ?? 0))
  const canChallenge = myDeficit === 0 && friendDeficit === 0

  // Fetch competition state from Supabase directly
  const fetchStatus = useCallback(async () => {
    if (!userId || !friendId) return

    const { data: comp } = await supabase
      .from('competitions')
      .select('*')
      .or(
        `and(challenger_id.eq.${userId},opponent_id.eq.${friendId}),and(challenger_id.eq.${friendId},opponent_id.eq.${userId})`
      )
      .in('status', ['pending', 'active', 'complete', 'rejected', 'forfeited'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Filter out dismissed completed competitions
    const dismissed = JSON.parse(localStorage.getItem('scc_dismissed_comps') ?? '[]')
    const dismissedSet = new Set(dismissed)
    const visibleComp = (comp && comp.status === 'complete' && dismissedSet.has(comp.id)) ? null : comp
    setCompetition(visibleComp ?? null)

    if (!visibleComp) {
      setCurrentRound(null)
      setMyUsedCardIds([])
      return
    }

    // Fetch current round
    const { data: round } = await supabase
      .from('competition_rounds')
      .select('*')
      .eq('competition_id', comp.id)
      .eq('round_number', comp.current_round)
      .maybeSingle()

    setCurrentRound(round ?? null)

    // Fetch used card IDs for current user
    const { data: used } = await supabase
      .from('competition_used_cards')
      .select('user_card_id')
      .eq('competition_id', comp.id)
      .eq('user_id', userId)

    setMyUsedCardIds((used || []).map(u => u.user_card_id))
  }, [userId, friendId])

  // Fetch for completed competitions (series_complete state)
  const fetchCompleted = useCallback(async () => {
    if (!userId || !friendId) return
    const { data: comp } = await supabase
      .from('competitions')
      .select('*')
      .or(
        `and(challenger_id.eq.${userId},opponent_id.eq.${friendId}),and(challenger_id.eq.${friendId},opponent_id.eq.${userId})`
      )
      .in('status', ['complete', 'rejected', 'forfeited'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (comp) setCompetition(comp)
  }, [userId, friendId])

  // Load my available cards
  const fetchMyCards = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_cards')
      .select('id, rating, player:players(first_name, last_name, face_image, position, age, card_number, team:teams(name, primary_color, text_color))')
      .eq('user_id', userId)
    setMyCards(data || [])
  }, [userId])

  useEffect(() => {
    if (!userId || !friendId) return
    fetchStatus()
    fetchMyCards()
  }, [fetchStatus, fetchMyCards])

  // Polling every 10s when active/pending
  useEffect(() => {
    function startPoll() {
      if (pollRef.current) return
      pollRef.current = setInterval(() => {
        if (visibleRef.current) fetchStatus()
      }, 10000)
    }
    function stopPoll() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }

    const state = getCompetitionState(competition, currentRound, userId)
    if (competition && competition.status !== 'complete' && competition.status !== 'rejected') {
      startPoll()
    } else {
      stopPoll()
    }

    return stopPoll
  }, [competition, currentRound, userId, fetchStatus])

  // Page Visibility API
  useEffect(() => {
    function handleVisibility() {
      visibleRef.current = !document.hidden
      if (!document.hidden) fetchStatus()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchStatus])

  async function handleChallenge() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/compete/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerId: userId, opponentId: friendId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send challenge'); return }
      await fetchStatus()
    } catch (err) {
      setError('Failed to send challenge')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelChallenge() {
    if (!competition) return
    setSubmitting(true)
    await supabase.from('competitions').delete().eq('id', competition.id)
    setCompetition(null)
    setSubmitting(false)
  }

  async function handleRespond(action) {
    if (!competition) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/compete/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: competition.id, userId, action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to respond'); return }
      if (action === 'reject') {
        setCompetition(null)
      } else {
        await fetchStatus()
      }
    } catch (err) {
      setError('Failed to respond')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitRound({ cardIds, lockedCardIds }) {
    if (!competition) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/compete/submit-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: competition.id, userId, cardIds, lockedCardIds }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to submit'); return }
      await fetchStatus()
      // If series complete, also fetch completed version
      if (data.bothSubmitted) {
        setTimeout(() => fetchStatus(), 500)
      }
    } catch (err) {
      setError('Failed to submit round')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinue() {
    if (!competition) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/compete/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: competition.id, userId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to continue'); return }
      await fetchStatus()
    } catch (err) {
      setError('Failed to continue')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSeriesDone() {
    if (competition?.id) {
      const dismissed = JSON.parse(localStorage.getItem('scc_dismissed_comps') ?? '[]')
      dismissed.push(competition.id)
      localStorage.setItem('scc_dismissed_comps', JSON.stringify(dismissed))
    }
    setCompetition(null)
  }

  if (competition === undefined) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontWeight: 700, color: BROWN }}>
        Loading battle status...
      </div>
    )
  }

  const state = getCompetitionState(competition, currentRound, userId)
  const isChallenger = competition ? competition.challenger_id === userId : false
  const availableCards = getAvailableCards(myCards, myUsedCardIds)
  const lockIns = competition
    ? (isChallenger ? competition.challenger_lock_ins_remaining : competition.opponent_lock_ins_remaining)
    : 5

  const isWaiting = state === 'waiting'
  const waitingForOpponent = isWaiting || (state === 'round_result' && (() => {
    if (!currentRound) return false
    const myContinued = isChallenger ? currentRound.challenger_continued : currentRound.opponent_continued
    const theirContinued = isChallenger ? currentRound.opponent_continued : currentRound.challenger_continued
    return myContinued && !theirContinued
  })())

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {error && (
        <div style={{
          backgroundColor: '#FDDEDE', color: '#B00020', borderRadius: '10px',
          padding: '10px 14px', fontSize: '14px', marginBottom: '12px',
          fontFamily: 'Arial, sans-serif', fontWeight: 700,
        }}>
          {error}
        </div>
      )}

      {state === 'no_competition' && (
        <div style={{ textAlign: 'center' }}>
          {canChallenge ? (
            <button
              style={{
                backgroundColor: BROWN, color: '#FFFFFF', border: 'none',
                borderRadius: '14px', padding: '12px 28px', minHeight: '48px',
                fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1, boxShadow: '0 3px 0 #5C2A00',
                width: '100%',
              }}
              onClick={handleChallenge}
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Challenge to Series'}
            </button>
          ) : (
            <div style={{
              backgroundColor: CARD_BG, border: `2px solid #C8A97A`,
              borderRadius: '12px', padding: '16px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '14px', color: '#5A2D0C', margin: '0 0 6px' }}>
                Collect more cards to compete
              </p>
              {myDeficit > 0 && (
                <p style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', color: '#8B6A4E', margin: '0 0 4px' }}>
                  You need {myDeficit} more card{myDeficit > 1 ? 's' : ''}
                </p>
              )}
              {friendDeficit > 0 && (
                <p style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', color: '#8B6A4E', margin: 0 }}>
                  {friendName} needs {friendDeficit} more card{friendDeficit > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {state === 'pending_sent' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            backgroundColor: '#FFF3CD', color: '#856404', borderRadius: '10px',
            padding: '12px 16px', fontSize: '14px', marginBottom: '12px',
            fontFamily: 'Arial, sans-serif', fontWeight: 700,
          }}>
            Challenge sent — waiting for {friendName} to respond...
          </div>
          <button
            style={{
              backgroundColor: 'transparent', color: BROWN, border: `2px solid ${BROWN}`,
              borderRadius: '14px', padding: '10px 24px', minHeight: '44px',
              fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px',
              cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
            }}
            onClick={handleCancelChallenge}
            disabled={submitting}
          >
            {submitting ? '...' : 'Cancel Challenge'}
          </button>
        </div>
      )}

      {state === 'pending_received' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '16px',
            color: '#3B1A08', marginBottom: '16px',
          }}>
            {friendName} challenges you to a series!
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              style={{
                backgroundColor: BROWN, color: '#FFFFFF', border: 'none',
                borderRadius: '14px', padding: '12px 28px', minHeight: '48px',
                fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '16px',
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                flex: 1, maxWidth: '180px', boxShadow: '0 3px 0 #5C2A00',
              }}
              onClick={() => handleRespond('accept')}
              disabled={submitting}
            >
              {submitting ? '...' : 'Accept'}
            </button>
            <button
              style={{
                backgroundColor: 'transparent', color: BROWN, border: `2px solid ${BROWN}`,
                borderRadius: '14px', padding: '12px 24px', minHeight: '48px',
                fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '16px',
                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
              }}
              onClick={() => handleRespond('reject')}
              disabled={submitting}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {(state === 'pick_cards' || state === 'waiting') && competition && (
        <>
          <SeriesHeader competition={competition} currentRound={currentRound} userId={userId} />
          {state === 'pick_cards' ? (
            <CompeteRoundPicker
              availableCards={availableCards}
              lockedInsRemaining={lockIns}
              onSubmit={handleSubmitRound}
            />
          ) : (
            <div style={{
              backgroundColor: '#FFF3CD', color: '#856404', borderRadius: '10px',
              padding: '14px 16px', textAlign: 'center',
              fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px',
            }}>
              Waiting for {friendName} to submit...
            </div>
          )}
        </>
      )}

      {state === 'round_result' && competition && currentRound && (
        <>
          <SeriesHeader competition={competition} currentRound={currentRound} userId={userId} />
          <RoundResult
            round={currentRound}
            competition={competition}
            userId={userId}
            friendName={friendName}
            onContinue={handleContinue}
            waitingForOpponent={(() => {
              const myContinued = isChallenger
                ? currentRound.challenger_continued
                : currentRound.opponent_continued
              return myContinued
            })()}
          />
        </>
      )}

      {state === 'series_complete' && competition && (
        <SeriesComplete
          competition={competition}
          userId={userId}
          onDone={handleSeriesDone}
        />
      )}
    </div>
  )
}
