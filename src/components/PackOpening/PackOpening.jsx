import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { EnvelopeAnimation } from './EnvelopeAnimation'
import { CardSwipeFlow } from './CardSwipeFlow'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function mapPlayer(p) {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    faceImage: p.face_image,
    team: p.team_name ?? '',
    position: p.position ?? '',
    age: p.age ?? '',
    height: p.height ?? '',
    weight: p.weight ?? '',
    cardNumber: p.card_number,
    rating: Math.floor(Math.random() * 99) + 1,
  }
}

/** Tiny spinner used during data loading */
function Spinner({ color }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9997,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: `5px solid rgba(255,255,255,0.2)`,
          borderTopColor: color || '#FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/** Error overlay */
function ErrorOverlay({ message, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9997,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
      }}
    >
      <p
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#FFFFFF',
          textAlign: 'center',
          maxWidth: '320px',
        }}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        style={{
          padding: '12px 32px',
          backgroundColor: '#E53E3E',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '10px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          cursor: 'pointer',
          boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
        }}
      >
        Close
      </button>
    </div>
  )
}

async function resolveCard(card, userId) {
  const newRating = card.rating

  const { data: existing } = await supabase
    .from('user_cards')
    .select('id, rating')
    .eq('user_id', userId)
    .eq('player_id', card.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('user_cards').insert({
      user_id: userId,
      player_id: card.id,
      rating: newRating,
      collected_at: new Date().toISOString(),
    })
    return { isDupe: false, rating: newRating }
  }

  if (newRating > existing.rating) {
    await supabase.from('user_cards').update({ rating: newRating }).eq('id', existing.id)
    return { isDupe: true, won: true, oldRating: existing.rating, newRating }
  }

  return { isDupe: true, won: false, keptRating: existing.rating, newRating }
}

export function PackOpening({ stadium, onClose }) {
  const [phase, setPhase] = useState('loading') // 'loading' | 'envelope' | 'swipe' | 'saving' | 'error'
  const [teamColor, setTeamColor] = useState('#2B6CB0')
  const [teamId, setTeamId] = useState(null)
  const [cards, setCards] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        // 1. Fetch stadium + team
        const { data: stadiumData, error: stadiumError } = await supabase
          .from('stadiums')
          .select('*, team:teams!fk_stadiums_team_id(*)')
          .eq('id', stadium.id)
          .single()

        if (stadiumError) throw stadiumError
        if (cancelled) return

        const team = stadiumData.team
        if (!team) throw new Error('No team linked to this stadium.')

        const color = team.primary_color || team.color || '#2B6CB0'
        setTeamColor(color)
        setTeamId(team.id)

        // 2. Fetch players for that team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', team.id)

        if (playersError) throw playersError
        if (cancelled) return

        if (!players || players.length === 0) {
          throw new Error('No players found for this team yet.')
        }

        // 3. Shuffle + take 5, map to camelCase (rating assigned in mapPlayer)
        const picked = shuffle(players)
          .slice(0, 5)
          .map((p) => mapPlayer({ ...p, team_name: team.name }))

        // 4. Check which are already owned
        const userId = JSON.parse(localStorage.getItem('scc_user'))?.id
        const pickedIds = picked.map((p) => p.id)
        const { data: owned } = await supabase
          .from('user_cards')
          .select('player_id')
          .eq('user_id', userId)
          .in('player_id', pickedIds)
        if (cancelled) return
        const ownedSet = new Set((owned ?? []).map((r) => r.player_id))
        const pickedWithNew = picked.map((p) => ({ ...p, isNew: !ownedSet.has(p.id) }))

        setCards(pickedWithNew)
        setPhase('envelope')
      } catch (err) {
        if (!cancelled) {
          console.error('[PackOpening] load error:', err)
          setErrorMsg(err.message || 'Something went wrong loading your pack.')
          setPhase('error')
        }
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [stadium.id])

  const handleEnvelopeComplete = useCallback(() => {
    setPhase('swipe')
  }, [])

  const handleSwipeComplete = useCallback(async () => {
    setPhase('saving')

    try {
      const userId = JSON.parse(localStorage.getItem('scc_user'))?.id
      if (!userId) throw new Error('Not logged in.')

      // Resolve each card (handles duplicates + rating upgrades)
      await Promise.all(cards.map((card) => resolveCard(card, userId)))

      onClose()
    } catch (err) {
      console.error('[PackOpening] save error:', err)
      setErrorMsg(err.message || 'Failed to save your cards. Please try again.')
      setPhase('error')
    }
  }, [cards, onClose])

  if (phase === 'loading') {
    return <Spinner color={teamColor} />
  }

  if (phase === 'error') {
    return <ErrorOverlay message={errorMsg} onClose={onClose} />
  }

  if (phase === 'saving') {
    return <Spinner color={teamColor} />
  }

  if (phase === 'envelope') {
    return (
      <EnvelopeAnimation
        teamColor={teamColor}
        onComplete={handleEnvelopeComplete}
      />
    )
  }

  if (phase === 'swipe') {
    return (
      <CardSwipeFlow
        cards={cards}
        teamColor={teamColor}
        onComplete={handleSwipeComplete}
      />
    )
  }

  return null
}
