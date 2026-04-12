import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PlayerCard } from '../Card/PlayerCard'

const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'

function toProps(uc) {
  if (!uc) return null
  const p = uc.player
  if (!p) return null
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
    isCollected: true,
    size: 'small',
    rating: uc.rating,
  }
}

export function RoundResult({ round, competition, userId, friendName, onContinue, waitingForOpponent }) {
  const [myCards, setMyCards] = useState([])
  const [theirCards, setTheirCards] = useState([])
  const [loadingCards, setLoadingCards] = useState(true)

  const isChallenger = competition.challenger_id === userId

  useEffect(() => {
    if (!round) return

    async function loadCards() {
      setLoadingCards(true)
      const challengerIds = round.challenger_card_ids || []
      const opponentIds = round.opponent_card_ids || []
      const allIds = [...new Set([...challengerIds, ...opponentIds])]

      if (allIds.length === 0) {
        setLoadingCards(false)
        return
      }

      const { data } = await supabase
        .from('user_cards')
        .select('id, rating, player:players(first_name, last_name, face_image, position, age, card_number, team:teams(name, primary_color))')
        .in('id', allIds)

      const cardMap = {}
      for (const c of data || []) {
        cardMap[c.id] = c
      }

      setMyCards(
        (isChallenger ? challengerIds : opponentIds).map(id => cardMap[id]).filter(Boolean)
      )
      setTheirCards(
        (isChallenger ? opponentIds : challengerIds).map(id => cardMap[id]).filter(Boolean)
      )
      setLoadingCards(false)
    }

    loadCards()
  }, [round?.id, isChallenger])

  if (!round) return null

  const myTotal = isChallenger ? round.challenger_total : round.opponent_total
  const theirTotal = isChallenger ? round.opponent_total : round.challenger_total
  const iWon = round.winner_id === userId
  const tied = !round.winner_id

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{
        textAlign: 'center', marginBottom: '16px',
        fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '20px', color: '#3B1A08',
      }}>
        ROUND {round.round_number} RESULT
      </div>

      {loadingCards ? (
        <div style={{ textAlign: 'center', color: BROWN, padding: '24px', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
          Loading cards...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {/* My team */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '13px',
              color: BROWN, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px',
            }}>
              Your Team
            </div>
            {myCards.map((card, i) => {
              const props = toProps(card)
              if (!props) return null
              return <PlayerCard key={card.id || i} {...props} />
            })}
            <div style={{
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '16px',
              color: BROWN, marginTop: '8px',
            }}>
              Total: {myTotal ?? '—'}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '2px', backgroundColor: '#E8D5B0',
            alignSelf: 'stretch', flexShrink: 0, borderRadius: '2px',
          }} />

          {/* Their team */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '13px',
              color: BROWN, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px',
            }}>
              {friendName}'s Team
            </div>
            {theirCards.map((card, i) => {
              const props = toProps(card)
              if (!props) return null
              return <PlayerCard key={card.id || i} {...props} />
            })}
            <div style={{
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '16px',
              color: BROWN, marginTop: '8px',
            }}>
              Total: {theirTotal ?? '—'}
            </div>
          </div>
        </div>
      )}

      <div style={{
        textAlign: 'center', fontFamily: 'Arial, sans-serif', fontWeight: 800,
        fontSize: '22px', marginBottom: '20px',
        color: tied ? '#856404' : iWon ? '#2D6A2D' : '#B00020',
      }}>
        {tied ? 'TIED!' : iWon ? 'YOU WIN THIS ROUND!' : 'THEY WIN THIS ROUND!'}
      </div>

      {waitingForOpponent ? (
        <div style={{
          textAlign: 'center', fontFamily: 'Arial, sans-serif', fontWeight: 700,
          fontSize: '15px', color: '#856404', backgroundColor: '#FFF3CD',
          borderRadius: '10px', padding: '12px 16px',
        }}>
          Waiting for {friendName}...
        </div>
      ) : (
        <button
          style={{
            width: '100%', backgroundColor: BROWN, color: '#FFFFFF', border: 'none',
            borderRadius: '14px', padding: '14px', minHeight: '50px',
            fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px',
            cursor: 'pointer', boxShadow: '0 3px 0 #5C2A00',
          }}
          onClick={onContinue}
        >
          Continue
        </button>
      )}
    </div>
  )
}
