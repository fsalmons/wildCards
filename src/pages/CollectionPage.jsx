import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard } from '../components/Card/PlayerCard'

import soccerIcon from '../../photos/sports_icons/football.png'
import basketballIcon from '../../photos/sports_icons/basketball.png'
import AppLogo from "../../photos/penalty_cards.png"
const SPORT_META = [
  { key: 'NWSL', icon: soccerIcon, label: 'NWSL' },
  { key: 'NCAA',  icon: basketballIcon, label: 'NCAA'  },
]


function getUser() {
  try { return JSON.parse(localStorage.getItem('scc_user')) ?? null }
  catch { return null }
}

function TeamRow({ team, collectedIds, ratingMap, onCardClick, defaultOpen, hasCards })
 {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

  const players = (team.players ?? []).slice().sort((a, b) => {
    const aCollected = collectedIds.has(a.id)
    const bCollected = collectedIds.has(b.id)

    // 1. collected first
    if (aCollected !== bCollected) {
      return aCollected ? -1 : 1
    }

    // 2. alphabetical by last name
    const aLast = (a.last_name ?? '').toLowerCase()
    const bLast = (b.last_name ?? '').toLowerCase()

    if (aLast < bLast) return -1
    if (aLast > bLast) return 1

    return 0
  })

  const collectedCount = players.filter((p) => collectedIds.has(p.id)).length
  const total = players.length

  return (
    <div style={{
        ...s.teamRow,
        opacity: hasCards ? 1 : 0.5,
        filter: hasCards ? 'none' : 'grayscale(100%)',
      }}>
      <button onClick={() => setOpen((o) => !o)} style={s.teamRowHeader} aria-expanded={open}>
        <span style={s.teamName}>{team.name}</span>
        <span style={s.teamRowRight}>
          <span style={s.progressBadge}>{collectedCount}/{total}</span>
        </span>
      </button>

      {/* Horizontal scroll strip */}
      <div style={{ ...s.cardStripWrapper, maxHeight: open ? '260px' : '0px' }} aria-hidden={!open}>
        <div style={s.cardStrip}>
          {players.map((player) => {
            const playerObj = {
              id: player.id,
              firstName: player.first_name,
              lastName: player.last_name,
              faceImage: player.face_image,
              cardNumber: player.card_number,
              position: player.position,
              age: player.age,
              team: team.name,
            }
            return (
              <div
                key={player.id}
                style={{ ...s.cardStripItem, cursor: 'pointer' }}
                onClick={() => onCardClick({ player: playerObj, teamColor: team.primary_color ?? '#8B4513', teamTextColor: team.text_color ?? '#FFFFFF', cardColor: team.card_color ?? '#F5ECD7', teamLogo: team.logo_url ?? null, league: team.sport ?? '', rating: ratingMap.get(player.id) ?? null, isCollected: collectedIds.has(player.id) })}
              >
                <PlayerCard
                  player={playerObj}
                  teamColor={team.primary_color ?? '#8B4513'}
                  teamTextColor={team.text_color ?? '#FFFFFF'}
                  cardColor={team.card_color ?? '#F5ECD7'}
                  teamLogo={team.logo_url ?? null}
                  league={team.sport ?? ''}
                  isCollected={collectedIds.has(player.id)}
                  rating={ratingMap.get(player.id) ?? null}
                  size="small"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SportSection({ sport, teams, collectedIds, ratingMap, onCardClick }) {
  const [allExpanded, setAllExpanded] = useState(false)
  const totalTeams = teams.length
  const teamsWithCards = teams.filter((t) => (t.players ?? []).some((p) => collectedIds.has(p.id))).length

  return (
    <section style={s.sportSection}>
      <div
          style={{ ...s.sportHeader, cursor: 'pointer' }}
          onClick={() => setAllExpanded((v) => !v)}
        >
        <span style={s.sportTitle}>
          <img
            src={sport.icon}
            alt={sport.label}
            style={{ width: 18, height: 18, marginRight: 8 }}
          />
      {sport.label}</span>
        <span style={s.sportProgress}>{teamsWithCards}/{totalTeams} teams</span>
      </div>
      <div style={s.expandAllRow}>
        <button onClick={() => setAllExpanded((v) => !v)} style={s.expandAllBtn}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      {teams
        .slice()
        .sort((a, b) => {
          const aHasCards = (a.players ?? []).some((p) => collectedIds.has(p.id))
          const bHasCards = (b.players ?? []).some((p) => collectedIds.has(p.id))

          // 1. teams with cards first
          if (aHasCards !== bHasCards) {
            return aHasCards ? -1 : 1
          }

          // 2. alphabetical by team name
          const aName = (a.name ?? '').toLowerCase()
          const bName = (b.name ?? '').toLowerCase()

          if (aName < bName) return -1
          if (aName > bName) return 1
          return 0
        })
        .map((team) => (
        <TeamRow 
          key={team.id} 
          team={team} 
          collectedIds={collectedIds} 
          ratingMap={ratingMap} 
          onCardClick={onCardClick} 
          defaultOpen={allExpanded} 
          hasCards={teamsWithCards}/>
      ))}
    </section>
  )
}

export function CollectionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const newCardId = searchParams.get('newCard')

  const [user] = useState(() => getUser())
  const [teamsBySport, setTeamsBySport] = useState({})
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [ratingMap, setRatingMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cardOverlay, setCardOverlay] = useState(null)
  const [newCardData, setNewCardData] = useState(null)

  useEffect(() => { if (!user) window.location.href = '/login' }, [user])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [teamsResult, cardsResult] = await Promise.all([
        supabase.from('teams').select('*, players(*)').order('name', { ascending: true }),
        supabase.from('user_cards').select('player_id, rating').eq('user_id', user.id),
      ])
      if (teamsResult.error) throw teamsResult.error
      if (cardsResult.error) throw cardsResult.error

      const ids = new Set((cardsResult.data ?? []).map((r) => r.player_id))
      const ratings = new Map((cardsResult.data ?? []).map((r) => [r.player_id, r.rating]))
      setCollectedIds(ids)
      setRatingMap(ratings)

      const grouped = {}
      for (const team of teamsResult.data ?? []) {
        const sport = team.sport ?? 'OTHER'
        if (!grouped[sport]) grouped[sport] = []
        grouped[sport].push(team)
      }
      setTeamsBySport(grouped)

      if (newCardId) {
        for (const team of teamsResult.data ?? []) {
          const found = (team.players ?? []).find((p) => p.id === newCardId)
          if (found) {
            setNewCardData({
              player: {
                id: found.id,
                firstName: found.first_name,
                lastName: found.last_name,
                faceImage: found.face_image,
                cardNumber: found.card_number,
                position: found.position,
                age: found.age,
                team: team.name,
              },
              teamColor: team.primary_color ?? '#8B4513',
              teamTextColor: team.text_color ?? '#FFFFFF',
              cardColor: team.card_color ?? '#F5ECD7',
              teamLogo: team.logo_url ?? null,
              league: team.sport ?? '',
              rating: ratings.get(found.id) ?? null,
            })
            break
          }
        }
      }
    } catch (err) {
      console.error('CollectionPage fetch error:', err)
      setError('Failed to load your collection. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, newCardId])

  useEffect(() => { fetchData() }, [fetchData])

  if (!user) return null

  const totalCollected = collectedIds.size


  return (
    <div style={s.page}>
      {/* ── Card overlay ── */}
      {cardOverlay && (
        <div style={s.cardOverlay} onClick={() => setCardOverlay(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <PlayerCard
              player={cardOverlay.player}
              teamColor={cardOverlay.teamColor}
              teamTextColor={cardOverlay.teamTextColor ?? '#FFFFFF'}
              cardColor={cardOverlay.cardColor ?? '#F5ECD7'}
              teamLogo={cardOverlay.teamLogo ?? null}
              league={cardOverlay.league ?? ''}
              isCollected={cardOverlay.isCollected}
              rating={cardOverlay.rating}
              size="full"
            />
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <div>
            <p style={s.usernameLabel}>{user.username}</p>

            {/* Title + image row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={s.pageTitle}>WildCards</h1>

              <img
                src={AppLogo}
                alt="WildCards icon"
                style={{
                  width: 40,
                  height: 40,
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>

          <button style={s.tradeBtn} onClick={() => navigate('/friends')}>
            Trade →
          </button>
        </div>
      </header>


      {/* ── Body ── */}
      <main style={s.main}>
        {loading && (
          <div style={s.centeredMessage}>
            <span style={s.loadingText}>Loading your cards...</span>
          </div>
        )}
        {!loading && error && (
          <div style={s.centeredMessage}>
            <span style={s.errorText}>{error}</span>
            <button onClick={fetchData} style={s.retryBtn}>Retry</button>
          </div>
        )}
        {!loading && !error && totalCollected === 0 && (
          <div style={s.centeredMessage}>
            <span style={s.emptyText}>No cards yet! Visit a stadium to get started 🏟️</span>
          </div>
        )}
        {!loading && !error && newCardData && (
          <section style={s.newSection}>
            <div style={s.newSectionHeader}>
              <span style={s.newBadge}>NEW</span>
            </div>
            <div style={s.cardStrip}>
              <div
                style={{ ...s.cardStripItem, cursor: 'pointer' }}
                onClick={() => setCardOverlay({ ...newCardData, isCollected: true })}
              >
                <PlayerCard
                  player={newCardData.player}
                  teamColor={newCardData.teamColor}
                  teamTextColor={newCardData.teamTextColor ?? '#FFFFFF'}
                  cardColor={newCardData.cardColor ?? '#F5ECD7'}
                  teamLogo={newCardData.teamLogo ?? null}
                  league={newCardData.league ?? ''}
                  isCollected={true}
                  rating={newCardData.rating}
                  size="small"
                />
              </div>
            </div>
          </section>
        )}
        {!loading && !error && SPORT_META.map(({ key, icon, label }) => {
          const teams = teamsBySport[key]
          if (!teams || teams.length === 0) return null
          return (
            <SportSection
              key={key}
              sport={{ key, icon, label }}
              teams={teams}
              collectedIds={collectedIds}
              ratingMap={ratingMap}
              onCardClick={setCardOverlay}
            />
          )
        })}
      </main>
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
  header: {
    backgroundColor: '#FAF3E0',
    padding: '20px 16px 12px',
    borderBottom: '2px solid #E8D5B0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  usernameLabel: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#A07850',
    margin: '0 0 2px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  pageTitle: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 800,
    fontSize: 26,
    color: '#8B4513',
    margin: 0,
    letterSpacing: '1px',
  },
  tradeBtn: {
    backgroundColor: '#8B4513',
    color: '#FAF3E0',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    minHeight: 44,
    whiteSpace: 'nowrap',
    boxShadow: '0 3px 0 #5C2A00',
  },
  main: {
    flex: 1,
    paddingBottom: 24,
  },
  sportSection: { marginBottom: 8 },
  sportHeader: {
    backgroundColor: '#F5ECD7',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E8D5B0',
  },
  sportTitle: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 800,
    fontSize: 17,
    color: '#8B4513',
  },
  sportProgress: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#8B4513',
    opacity: 0.7,
  },
  expandAllRow: {
    backgroundColor: '#F5ECD7',
    padding: '6px 16px 10px',
    borderBottom: '1px solid #E8D5B0',
  },
  expandAllBtn: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: '#8B4513',
    background: 'none',
    border: '1.5px solid #8B4513',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
  },
  teamRow: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E8D5B0',
  },
  teamRowHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  teamName: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: '#333',
  },
  teamRowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  progressBadge: {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#8B4513',
    backgroundColor: '#F5ECD7',
    padding: '2px 8px',
    borderRadius: 10,
    border: '1px solid #E8D5B0',
  },
  chevron: {
    fontSize: 12,
    color: '#8B4513',
    transition: 'transform 0.25s ease',
    display: 'inline-block',
  },
  // Horizontal scroll strip
  cardStripWrapper: {
    overflow: 'hidden',
    transition: 'max-height 0.35s ease',
  },
  cardStrip: {
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'auto',
    gap: 10,
    padding: '12px 16px 16px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  cardStripItem: {
    flexShrink: 0,
  },
  centeredMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    gap: 16,
  },
  loadingText: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 18, color: '#8B4513', opacity: 0.7 },
  errorText: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 16, color: '#CC3333', textAlign: 'center', lineHeight: 1.4 },
  retryBtn: { fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 15, color: '#FAF3E0', backgroundColor: '#8B4513', border: 'none', borderRadius: 8, padding: '8px 24px', cursor: 'pointer' },
  emptyText: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 18, color: '#8B4513', textAlign: 'center', lineHeight: 1.5 },
  cardOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  newSection: { marginBottom: 8 },
  newSectionHeader: {
    backgroundColor: '#F5ECD7', padding: '12px 16px',
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid #E8D5B0',
  },
  newBadge: {
    fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 17,
    color: '#FFFFFF', backgroundColor: '#CC0000',
    padding: '2px 10px', borderRadius: 8, letterSpacing: '1px',
  },
}
