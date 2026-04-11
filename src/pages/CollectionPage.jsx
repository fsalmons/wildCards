import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard } from '../components/Card/PlayerCard'

function getUser() {
  try { return JSON.parse(localStorage.getItem('scc_user')) ?? null }
  catch { return null }
}

function TeamRow({ team, collectedIds, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

  const players = team.players ?? []
  const collectedCount = players.filter((p) => collectedIds.has(p.id)).length
  const total = players.length

  return (
    <div style={s.teamRow}>
      <button onClick={() => setOpen((o) => !o)} style={s.teamRowHeader} aria-expanded={open}>
        <span style={s.teamName}>{team.name}</span>
        <span style={s.teamRowRight}>
          <span style={s.progressBadge}>{collectedCount}/{total}</span>
          <span style={{ ...s.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        </span>
      </button>

      {/* Horizontal scroll strip */}
      <div style={{ ...s.cardStripWrapper, maxHeight: open ? '260px' : '0px' }} aria-hidden={!open}>
        <div style={s.cardStrip}>
          {players.map((player) => (
            <div key={player.id} style={s.cardStripItem}>
              <PlayerCard
                player={player}
                teamColor={team.primary_color ?? '#8B4513'}
                isCollected={collectedIds.has(player.id)}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SportSection({ sport, teams, collectedIds }) {
  const [allExpanded, setAllExpanded] = useState(false)
  const totalTeams = teams.length
  const teamsWithCards = teams.filter((t) => (t.players ?? []).some((p) => collectedIds.has(p.id))).length

  return (
    <section style={s.sportSection}>
      <div style={s.sportHeader}>
        <span style={s.sportTitle}>{sport.emoji}&nbsp;&nbsp;{sport.label}</span>
        <span style={s.sportProgress}>{teamsWithCards}/{totalTeams} teams</span>
      </div>
      <div style={s.expandAllRow}>
        <button onClick={() => setAllExpanded((v) => !v)} style={s.expandAllBtn}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      {teams.map((team) => (
        <TeamRow key={team.id} team={team} collectedIds={collectedIds} defaultOpen={allExpanded} />
      ))}
    </section>
  )
}

export function CollectionPage() {
  const navigate = useNavigate()
  const [user] = useState(() => getUser())
  const [teamsBySport, setTeamsBySport] = useState({})
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (!user) window.location.href = '/login' }, [user])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [teamsResult, cardsResult] = await Promise.all([
        supabase.from('teams').select('*, players(*)'),
        supabase.from('user_cards').select('player_id').eq('user_id', user.id),
      ])
      if (teamsResult.error) throw teamsResult.error
      if (cardsResult.error) throw cardsResult.error

      const ids = new Set((cardsResult.data ?? []).map((r) => r.player_id))
      setCollectedIds(ids)

      const grouped = {}
      for (const team of teamsResult.data ?? []) {
        const sport = team.sport ?? 'OTHER'
        if (!grouped[sport]) grouped[sport] = []
        grouped[sport].push(team)
      }
      setTeamsBySport(grouped)
    } catch (err) {
      console.error('CollectionPage fetch error:', err)
      setError('Failed to load your collection. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  if (!user) return null

  const totalCollected = collectedIds.size
  const SPORT_META = [
    { key: 'NWSL', emoji: '⚽', label: 'NWSL' },
    { key: 'CBB',  emoji: '🏀', label: 'CBB'  },
  ]

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <div>
            <p style={s.usernameLabel}>{user.username}</p>
            <h1 style={s.pageTitle}>WildCards</h1>
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
        {!loading && !error && SPORT_META.map(({ key, emoji, label }) => {
          const teams = teamsBySport[key]
          if (!teams || teams.length === 0) return null
          return (
            <SportSection key={key} sport={{ key, emoji, label }} teams={teams} collectedIds={collectedIds} />
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
}
