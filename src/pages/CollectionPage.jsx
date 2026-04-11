import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PlayerCard } from '../components/Card/PlayerCard'
import { BottomNav } from '../components/Nav/BottomNav'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('scc_user')) ?? null
  } catch {
    return null
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function TeamRow({ team, collectedIds, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  // keep in sync when parent toggles "expand all"
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  const players = team.players ?? []
  const collectedCount = players.filter((p) => collectedIds.has(p.id)).length
  const total = players.length

  return (
    <div style={styles.teamRow}>
      {/* Row header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={styles.teamRowHeader}
        aria-expanded={open}
      >
        <span style={styles.teamName}>{team.name}</span>
        <span style={styles.teamRowRight}>
          <span style={styles.progressBadge}>
            {collectedCount}/{total}
          </span>
          <span style={{ ...styles.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>
            ▶
          </span>
        </span>
      </button>

      {/* Collapsible card grid */}
      <div
        style={{
          ...styles.cardGridWrapper,
          maxHeight: open ? '2000px' : '0px',
        }}
        aria-hidden={!open}
      >
        <div style={styles.cardGrid}>
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              teamColor={team.primary_color ?? '#8B4513'}
              isCollected={collectedIds.has(player.id)}
              size="small"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SportSection({ sport, teams, collectedIds }) {
  const [allExpanded, setAllExpanded] = useState(false)

  const totalTeams = teams.length
  const teamsWithCards = teams.filter(
    (t) => (t.players ?? []).some((p) => collectedIds.has(p.id))
  ).length

  return (
    <section style={styles.sportSection}>
      {/* Sport header */}
      <div style={styles.sportHeader}>
        <span style={styles.sportTitle}>
          {sport.emoji}&nbsp;&nbsp;{sport.label}
        </span>
        <span style={styles.sportProgress}>
          {teamsWithCards}/{totalTeams} teams with cards
        </span>
      </div>

      {/* Expand all */}
      <div style={styles.expandAllRow}>
        <button
          onClick={() => setAllExpanded((v) => !v)}
          style={styles.expandAllBtn}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Team rows */}
      {teams.map((team) => (
        <TeamRow
          key={team.id}
          team={team}
          collectedIds={collectedIds}
          defaultOpen={allExpanded}
        />
      ))}
    </section>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export function CollectionPage() {
  const [user] = useState(() => getUser())
  const [activeTab, setActiveTab] = useState('NAME') // 'NAME' | 'TRADE'
  const [teamsBySport, setTeamsBySport] = useState({})
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      window.location.href = '/login'
    }
  }, [user])

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

      // Build Set of collected player ids
      const ids = new Set((cardsResult.data ?? []).map((r) => r.player_id))
      setCollectedIds(ids)

      // Group teams by sport
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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!user) return null

  // ── empty state check
  const totalCollected = collectedIds.size

  // ── sport ordering: NWSL first, then CBB
  const SPORT_META = [
    { key: 'NWSL', emoji: '⚽', label: 'NWSL' },
    { key: 'CBB', emoji: '🏀', label: 'CBB' },
  ]

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>MY COLLECTION</h1>
        <div style={styles.toggleRow}>
          {['NAME', 'TRADE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.toggleBtn,
                ...(activeTab === tab ? styles.toggleBtnActive : {}),
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <main style={styles.main}>
        {loading && (
          <div style={styles.centeredMessage}>
            <span style={styles.loadingText}>Loading your cards...</span>
          </div>
        )}

        {!loading && error && (
          <div style={styles.centeredMessage}>
            <span style={styles.errorText}>{error}</span>
            <button onClick={fetchData} style={styles.retryBtn}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && totalCollected === 0 && (
          <div style={styles.centeredMessage}>
            <span style={styles.emptyText}>
              No cards yet! Visit a stadium to get started 🏟️
            </span>
          </div>
        )}

        {!loading && !error && SPORT_META.map(({ key, emoji, label }) => {
          const teams = teamsBySport[key]
          if (!teams || teams.length === 0) return null
          return (
            <SportSection
              key={key}
              sport={{ key, emoji, label }}
              teams={teams}
              collectedIds={collectedIds}
            />
          )
        })}
      </main>

      <BottomNav />
    </div>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100dvh',
    backgroundColor: '#FAF3E0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Fredoka One', cursive",
    maxWidth: '390px',
    margin: '0 auto',
    overflowX: 'hidden',
  },

  // Header
  header: {
    backgroundColor: '#FAF3E0',
    padding: '20px 16px 12px',
    borderBottom: '2px solid #E8D5B0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  pageTitle: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '28px',
    color: '#8B4513',
    margin: '0 0 12px 0',
    letterSpacing: '1px',
  },
  toggleRow: {
    display: 'flex',
    gap: '0',
    border: '2px solid #8B4513',
    borderRadius: '8px',
    overflow: 'hidden',
    width: 'fit-content',
  },
  toggleBtn: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '14px',
    padding: '6px 20px',
    background: 'transparent',
    color: '#8B4513',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'background 0.15s, color 0.15s',
  },
  toggleBtnActive: {
    backgroundColor: '#8B4513',
    color: '#FAF3E0',
  },

  // Main content area
  main: {
    flex: 1,
    paddingBottom: '80px', // space for bottom nav
  },

  // Sport section
  sportSection: {
    marginBottom: '8px',
  },
  sportHeader: {
    backgroundColor: '#F5ECD7',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E8D5B0',
  },
  sportTitle: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    color: '#8B4513',
    letterSpacing: '0.5px',
  },
  sportProgress: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '13px',
    color: '#8B4513',
    opacity: 0.7,
  },
  expandAllRow: {
    backgroundColor: '#F5ECD7',
    padding: '6px 16px 10px',
    borderBottom: '1px solid #E8D5B0',
  },
  expandAllBtn: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '13px',
    color: '#8B4513',
    background: 'none',
    border: '1.5px solid #8B4513',
    borderRadius: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    letterSpacing: '0.3px',
  },

  // Team row
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
    fontFamily: "'Fredoka One', cursive",
    fontSize: '16px',
    color: '#333333',
    letterSpacing: '0.3px',
  },
  teamRowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressBadge: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '14px',
    color: '#8B4513',
    backgroundColor: '#F5ECD7',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid #E8D5B0',
  },
  chevron: {
    fontSize: '12px',
    color: '#8B4513',
    transition: 'transform 0.25s ease',
    display: 'inline-block',
  },

  // Card grid — collapsible wrapper uses max-height CSS trick
  cardGridWrapper: {
    overflow: 'hidden',
    transition: 'max-height 0.35s ease',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    padding: '12px 12px 16px',
    justifyItems: 'center',
  },

  // States
  centeredMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    gap: '16px',
  },
  loadingText: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    color: '#8B4513',
    opacity: 0.7,
  },
  errorText: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '16px',
    color: '#CC3333',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  retryBtn: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '15px',
    color: '#FAF3E0',
    backgroundColor: '#8B4513',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 24px',
    cursor: 'pointer',
  },
  emptyText: {
    fontFamily: "'Fredoka One', cursive",
    fontSize: '18px',
    color: '#8B4513',
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
