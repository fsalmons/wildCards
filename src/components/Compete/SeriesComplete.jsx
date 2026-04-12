import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'

export function SeriesComplete({ competition, userId, onDone }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)

  const isChallenger = competition.challenger_id === userId
  const iWon = competition.winner_id === userId
  const eloChange = competition.elo_change ?? 0

  const myEloBefore = isChallenger
    ? competition.challenger_elo_before
    : competition.opponent_elo_before
  const myEloAfter = iWon
    ? (myEloBefore ?? 1000) + eloChange
    : (myEloBefore ?? 1000) - eloChange

  useEffect(() => {
    async function loadRounds() {
      const { data } = await supabase
        .from('competition_rounds')
        .select('*')
        .eq('competition_id', competition.id)
        .order('round_number', { ascending: true })

      setRounds(data || [])
      setLoading(false)
    }
    loadRounds()
  }, [competition.id])

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Result banner */}
      <div style={{
        backgroundColor: iWon ? '#D4EDDA' : '#FDDEDE',
        border: `3px solid ${iWon ? '#2D6A2D' : '#B00020'}`,
        borderRadius: '16px', padding: '20px', textAlign: 'center',
        marginBottom: '20px', boxShadow: `0 4px 0 ${iWon ? '#1A4A1A' : '#800015'}`,
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>
          {iWon ? '🏆' : '💔'}
        </div>
        <div style={{
          fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '26px',
          color: iWon ? '#2D6A2D' : '#B00020', letterSpacing: '1px',
        }}>
          {iWon ? 'SERIES WIN!' : 'SERIES LOSS'}
        </div>
        <div style={{
          fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '15px',
          color: '#5A2D0C', marginTop: '8px',
        }}>
          Score: {isChallenger ? competition.challenger_wins : competition.opponent_wins}
          {' - '}
          {isChallenger ? competition.opponent_wins : competition.challenger_wins}
        </div>
      </div>

      {/* ELO change */}
      {myEloBefore != null && (
        <div style={{
          backgroundColor: CARD_BG, border: `2px solid ${BROWN}`, borderRadius: '12px',
          padding: '16px', marginBottom: '20px', textAlign: 'center',
          boxShadow: '0 3px 0 #5C2A00',
        }}>
          <div style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '13px',
            color: BROWN, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px',
          }}>
            ELO
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', color: '#8B7355' }}>Before</div>
              <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '22px', color: BROWN }}>
                {myEloBefore.toLocaleString()}
              </div>
            </div>
            <div style={{
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '20px',
              color: iWon ? '#2D6A2D' : '#B00020',
            }}>
              {iWon ? `+${eloChange}` : `-${eloChange}`}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', color: '#8B7355' }}>After</div>
              <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '22px', color: BROWN }}>
                {myEloAfter.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round summaries */}
      {!loading && rounds.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '13px',
            color: BROWN, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            Round Summary
          </div>
          {rounds.map(r => {
            const myTotal = isChallenger ? r.challenger_total : r.opponent_total
            const theirTotal = isChallenger ? r.opponent_total : r.challenger_total
            const rWon = r.winner_id === userId
            const rTied = !r.winner_id
            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: CARD_BG, border: `2px solid ${rTied ? '#C8A97A' : rWon ? '#2D6A2D' : '#B00020'}`,
                  borderRadius: '10px', padding: '12px 16px', marginBottom: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '14px', color: '#3B1A08' }}>
                  Round {r.round_number}
                </span>
                <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '14px', color: '#5A2D0C' }}>
                  {myTotal ?? '—'} vs {theirTotal ?? '—'}
                </span>
                <span style={{
                  fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '13px',
                  color: rTied ? '#856404' : rWon ? '#2D6A2D' : '#B00020',
                }}>
                  {rTied ? 'TIE' : rWon ? 'WIN' : 'LOSS'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <button
        style={{
          width: '100%', backgroundColor: BROWN, color: '#FFFFFF', border: 'none',
          borderRadius: '14px', padding: '14px', minHeight: '50px',
          fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px',
          cursor: 'pointer', boxShadow: '0 3px 0 #5C2A00',
        }}
        onClick={onDone}
      >
        Done
      </button>
    </div>
  )
}
