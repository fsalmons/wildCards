import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getStravaAuthUrl, syncStrava } from '../lib/strava'
import { PlayerCard } from '../components/Card/PlayerCard'

import trophyIcon from '../../photos/trophy.png'
import gymIcon from '../../photos/gym.png'
import runIcon from '../../photos/run.png'


const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'

function StatBox({ icon, value, label }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: CARD_BG,
        border: `2px solid ${BROWN}`,
        borderRadius: 12,
        padding: '16px 12px',
        textAlign: 'center',
        boxShadow: `0 3px 0 #5C2A00`,
      }}
    >
      <div sstyle={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12
                }}>
        <img
          src={icon}
          alt={label}
          style={{ width: 30, height: 30 }}
        />
      </div>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontWeight: '800',
          fontSize: 24,
          color: BROWN,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontWeight: '700',
          fontSize: 11,
          color: '#8B7355',
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function CollectionPicker({ userId, onSelect, onClose }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_cards')
        .select('id, rating, player:players(id, first_name, last_name, face_image, position, age, card_number, team:teams(name, sport, primary_color, text_color, card_color)')
        .eq('user_id', userId)

      if (data) {
        setCards(data.map((uc) => ({
        userCardId: uc.id,
        rating: uc.rating,
        player: {
          id: uc.player.id,
          firstName: uc.player.first_name,
          lastName: uc.player.last_name,
          faceImage: uc.player.face_image,
          position: uc.player.position,
          age: uc.player.age,
          cardNumber: uc.player.card_number,
          team: uc.player.team?.name || '',
        },

        // ✅ FULL TEAM THEME PALETTE
        teamColor: uc.player.team?.primary_color ?? '#8B4513',
        teamTextColor: uc.player.team?.text_color ?? '#FFFFFF',
        cardColor: uc.player.team?.card_color ?? '#F5ECD7',
        teamLogo: uc.player.team?.logo_url ?? null,
        league: uc.player.team?.sport ?? '',
      })))

      }
      setLoading(false)
    }
    load()
  }, [userId])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        backgroundColor: BEIGE,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Modal header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: BROWN,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: '800',
            fontSize: 18,
            color: '#FFFFFF',
            letterSpacing: '0.5px',
          }}
        >
          Pick a Player to Train
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: '700',
            fontSize: 16,
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      {loading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            color: BROWN,
            fontSize: 16,
          }}
        >
          Loading your cards...
        </div>
      ) : cards.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            color: '#8B7355',
            fontSize: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          No cards in your collection yet. Visit stadiums to collect them!
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            padding: 16,
          }}
        >
          {cards.map((c) => (
            <button
              key={c.userCardId}
              onClick={() => onSelect(c.userCardId)}
              style={{
                background: 'none',
                border: `2px solid ${c.teamColor}`,
                borderRadius: 12,
                padding: 4,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PlayerCard
                player={c.player}
                teamColor={c.teamColor}
                teamTextColor={c.teamTextColor}
                cardColor={c.cardColor}
                teamLogo={c.teamLogo}
                league={c.league}
                isCollected
                size="small"
                rating={c.rating}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const [user, setUser] = useState(null)
  const [elo, setElo] = useState(null)
  const [activeCard, setActiveCard] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('scc_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  // Fetch fresh ELO from DB whenever user id is known
  useEffect(() => {
    if (!user?.id) return
    async function fetchElo() {
      const { data } = await supabase
        .from('users')
        .select('elo')
        .eq('id', user.id)
        .single()
      if (data?.elo != null) setElo(data.elo)
    }
    fetchElo()
  }, [user?.id])

  // Handle Strava OAuth callback code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return

    const stored = localStorage.getItem('scc_user')
    if (!stored) return

    const userId = JSON.parse(stored)?.id
    if (!userId) return

    // Remove code from URL immediately
    const cleanUrl = window.location.pathname
    window.history.replaceState({}, '', cleanUrl)

    async function exchangeCode() {
      try {
        const res = await fetch('/api/strava/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, userId }),
        })
        const data = res.ok ? await res.json() : null
        if (data?.success) {
          setSyncMsg(`Connected as ${data.athleteName}!`)
        } else {
          setSyncMsg('Strava connection failed.')
        }
      } catch {
        setSyncMsg('Strava connection failed.')
      }
      await refreshUser(userId)
    }

    exchangeCode()
  }, [])

  // Load active card when user changes
  useEffect(() => {
    if (!user?.active_card_id) {
      setActiveCard(null)
      return
    }
    async function loadActiveCard() {
      const { data } = await supabase
        .from('user_cards')
        .select('id, rating, player:players(id, first_name, last_name, face_image, position, age, card_number, team:teams(name, primary_color))')
        .eq('id', user.active_card_id)
        .single()

      if (data) {
        setActiveCard({
          userCardId: data.id,
          rating: data.rating,
          player: {
            id: data.player.id,
            firstName: data.player.first_name,
            lastName: data.player.last_name,
            faceImage: data.player.face_image,
            position: data.player.position,
            age: data.player.age,
            cardNumber: data.player.card_number,
            team: data.player.team?.name || '',
          },
          teamColor: data.player.team?.primary_color || BROWN,
        })
      }
    }
    loadActiveCard()
  }, [user?.active_card_id, user?.id])

  const refreshUser = useCallback(async (userId) => {
    const id = userId || user?.id
    if (!id) return
    const { data } = await supabase.from('users').select('*').eq('id', id).single()
    if (data) {
      localStorage.setItem('scc_user', JSON.stringify(data))
      setUser(data)
    }
  }, [user?.id])

  const handleSelectActiveCard = useCallback(async (userCardId) => {
    if (!user?.id) return
    await supabase.from('users').update({ active_card_id: userCardId }).eq('id', user.id)
    setShowPicker(false)
    await refreshUser()
  }, [user?.id, refreshUser])

  const handleDisconnectStrava = useCallback(async () => {
    if (!user?.id) return
    await supabase.from('users').update({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
    }).eq('id', user.id)
    await refreshUser()
  }, [user?.id, refreshUser])

  const handleSyncStrava = useCallback(async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncMsg(null)
    const result = await syncStrava(user.id)
    if (result) {
      setSyncMsg(`Synced ${result.minutesSynced} min${result.newRating ? ` — rating now ${result.newRating}` : ''}`)
      await refreshUser()
    } else {
      setSyncMsg('Sync failed. Try again.')
    }
    setSyncing(false)
  }, [user?.id, refreshUser])

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          backgroundColor: BEIGE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          color: BROWN,
        }}
      >
        Loading...
      </div>
    )
  }

  const username = user.username || user.email || 'Trainer'
  const displayElo = elo ?? user.elo ?? 1000

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: BEIGE,
        fontFamily: 'Arial, sans-serif',
        paddingBottom: 80,
      }}
    >
      {showPicker && (
        <CollectionPicker
          userId={user.id}
          onSelect={handleSelectActiveCard}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Page header */}
      <div
        style={{
          backgroundColor: BROWN,
          padding: '24px 20px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: '800',
            fontSize: 28,
            color: '#FFFFFF',
            letterSpacing: '1px',
          }}
        >
          {username}
        </div>
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: '700',
            fontSize: 14,
            color: 'rgba(255,255,255,0.75)',
            marginTop: 4,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          WildCards
        </div>
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: '700',
            fontSize: 13,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 6,
            letterSpacing: '1px',
          }}
        >
          ELO: {displayElo.toLocaleString()}
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Active Player Section */}
        <section>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              fontWeight: '800',
              fontSize: 13,
              color: BROWN,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >

          TRAINING
          </div>

          {activeCard ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <PlayerCard
                player={activeCard.player}
                teamColor={activeCard.teamColor}
                isCollected
                size="full"
                rating={activeCard.rating}
                isActiveCard
              />
              <button
                onClick={() => setShowPicker(true)}
                style={{
                  background: BROWN,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 28px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: '700',
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 3px 0 #5C2A00',
                }}
              >
                Change Player
              </button>
            </div>
          ) : (
            <div
              style={{
                border: `2px dashed ${BROWN}`,
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: CARD_BG,
              }}
            >
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                <img
                  src={gymIcon}
                  alt="gym"
                  style={{ width: 40, height: 40 }}
                />
              </div>
              <p
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: '700',
                  fontSize: 15,
                  color: '#8B7355',
                  margin: 0,
                }}
              >
                Assign a player to train
              </p>
              <button
                onClick={() => setShowPicker(true)}
                style={{
                  marginTop: 16,
                  background: BROWN,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 28px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: '700',
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 3px 0 #5C2A00',
                }}
              >
                Pick a Player
              </button>
            </div>
          )}
        </section>

        {/* Strava Section */}
        <section>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              fontWeight: '800',
              fontSize: 13,
              color: BROWN,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Strava
          </div>

          <div
            style={{
              backgroundColor: CARD_BG,
              border: `2px solid ${BROWN}`,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {user.strava_athlete_id ? (
              <>
                <div
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: '700',
                    fontSize: 15,
                    color: '#2D6A2D',
                  }}
                >
                  Connected
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSyncStrava}
                    disabled={syncing}
                    style={{
                      background: BROWN,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: '700',
                      fontSize: 14,
                      cursor: syncing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 3px 0 #5C2A00',
                      opacity: syncing ? 0.7 : 1,
                    }}
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={handleDisconnectStrava}
                    style={{
                      background: 'transparent',
                      color: '#8B4513',
                      border: `2px solid ${BROWN}`,
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: '700',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => { window.location.href = getStravaAuthUrl() }}
                style={{
                  background: '#FC4C02',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 24px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: '800',
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 3px 0 #C03800',
                  textAlign: 'center',
                }}
              >
                Connect Strava
              </button>
            )}

            {syncMsg && (
              <p
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 13,
                  color: '#5C2A00',
                  margin: 0,
                  fontWeight: '700',
                }}
              >
                {syncMsg}
              </p>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              fontWeight: '800',
              fontSize: 13,
              color: BROWN,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Stats
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <StatBox
              icon={runIcon}
              value={user.total_exercise_minutes ?? 0}
              label="Exercise logged"
            />
            <StatBox
              icon={trophyIcon}
              value={user.total_rating_points_earned ?? 0}
              label="Rating points earned"
            />
          </div>
        </section>

      </div>
    </div>
  )
}
