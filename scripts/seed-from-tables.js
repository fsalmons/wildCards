/**
 * Seed NWSL teams, stadiums, and players from the tables/ folder in fsalmons/wildCards GitHub repo.
 * Run: node scripts/seed-from-tables.js
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function fetchCSV(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    // Simple CSV parse — handles quoted fields
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += ch }
    }
    values.push(current.trim())
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').replace(/^"|"$/g, '')]))
  })
}

// Stadium name → {lat, lon} from the scraped stadiums.csv
const STADIUM_COORDS = {
  'BMO Stadium':                                  { lat: 34.012814,   lon: -118.2840892 },
  'PayPal Park':                                  { lat: 37.3513087,  lon: -121.924672  },
  'Gillette Stadium':                             { lat: 42.0908879,  lon: -71.2641731  },
  'Northwestern Medicine Field at Martin Stadium':{ lat: 42.0585727,  lon: -87.6705438  },
  'Centennial Stadium':                           { lat: 39.5958723,  lon: -104.939872  },
  'Sports Illustrated Stadium':                   { lat: 40.736667,   lon: -74.150278   },
  'Shell Energy Stadium':                         { lat: 29.7520265,  lon: -95.3523409  },
  'CPKC Stadium':                                 { lat: 39.1195165,  lon: -94.566508   },
  'WakeMed Soccer Park':                          { lat: 35.78686,    lon: -78.7549887  },
  'Inter&Co Stadium':                             { lat: 28.5411041,  lon: -81.3891411  },
  'Providence Park':                              { lat: 45.5215291,  lon: -122.6918185 },
  'Lynn Family Stadium':                          { lat: 38.2593321,  lon: -85.7325522  },
  'Snapdragon Stadium':                           { lat: 32.7842418,  lon: -117.1223904 },
  'Lumen Field':                                  { lat: 47.5953459,  lon: -122.3316443 },
  'America First Field':                          { lat: 40.5829533,  lon: -111.893312  },
  'Audi Field':                                   { lat: 38.8682612,  lon: -77.0126092  },
  'CardinalPark':                                 { lat: 38.3293,     lon: -85.7558     },
}

// NWSL team colors (primary)
const TEAM_COLORS = {
  'Angel City FC':        '#FF5F1F',
  'Bay FC':               '#003DA5',
  'Boston Legacy FC':     '#00B140',
  'Chicago Stars FC':     '#FF6B35',
  'Denver Summit FC':     '#6F263D',
  'Gotham FC':            '#0066B2',
  'Houston Dash':         '#F4911E',
  'Kansas City Current':  '#A6192E',
  'North Carolina Courage': '#CC0000',
  'Orlando Pride':        '#5D2D91',
  'Portland Thorns FC':   '#8B1A1A',
  'Racing Louisville FC': '#002C77',
  'San Diego Wave FC':    '#00B5E2',
  'Seattle Reign FC':     '#00B140',
  'Utah Royals':          '#001689',
  'Washington Spirit':    '#003087',
}

async function run() {
  console.log('Fetching CSV data from GitHub…')

  const [teamsText, playersText] = await Promise.all([
    fetchCSV('https://raw.githubusercontent.com/fsalmons/wildCards/main/tables/nwls_teams.csv'),
    fetchCSV('https://raw.githubusercontent.com/fsalmons/wildCards/main/tables/nwls_players_with_photos.csv'),
  ])

  const teamsRaw = parseCSV(teamsText)
  const playersRaw = parseCSV(playersText)

  console.log(`Parsed ${teamsRaw.length} teams, ${playersRaw.length} players`)

  // ── 1. Upsert teams ──────────────────────────────────────────────────────────
  console.log('\n── Seeding teams ──')
  const teamRecords = [
    ...teamsRaw.map(t => ({
      name: t.Team,
      sport: 'NWSL',
      primary_color: TEAM_COLORS[t.Team] ?? '#8B4513',
    })),
    // Washington Spirit missing from teams CSV — add manually
    { name: 'Washington Spirit', sport: 'NWSL', primary_color: TEAM_COLORS['Washington Spirit'] },
  ]

  // Delete in FK order: players → stadiums → teams
  const { data: existingNwslTeams } = await supabase.from('teams').select('id').eq('sport', 'NWSL')
  const existingIds = (existingNwslTeams ?? []).map(t => t.id)
  if (existingIds.length > 0) {
    // Get old player ids to delete user_cards first
    const { data: oldPlayers } = await supabase.from('players').select('id').in('team_id', existingIds)
    const oldPlayerIds = (oldPlayers ?? []).map(p => p.id)
    if (oldPlayerIds.length > 0) {
      // Get old user_card ids
      const { data: oldUC } = await supabase.from('user_cards').select('id').in('player_id', oldPlayerIds)
      const oldUCIds = (oldUC ?? []).map(c => c.id)
      if (oldUCIds.length > 0) {
        // Delete trades that reference these user_cards
        const { error: eT1 } = await supabase.from('trades').delete().in('offered_card_id', oldUCIds)
        if (eT1) { console.error('Delete trades (offered) error:', eT1.message); process.exit(1) }
        const { error: eT2 } = await supabase.from('trades').delete().in('requested_card_id', oldUCIds)
        if (eT2) { console.error('Delete trades (requested) error:', eT2.message); process.exit(1) }
      }
      const { error: e0 } = await supabase.from('user_cards').delete().in('player_id', oldPlayerIds)
      if (e0) { console.error('Delete old user_cards error:', e0.message); process.exit(1) }
    }
    const { error: e1 } = await supabase.from('players').delete().in('team_id', existingIds)
    if (e1) { console.error('Delete old players error:', e1.message); process.exit(1) }
    const { error: e2 } = await supabase.from('stadiums').delete().in('team_id', existingIds)
    if (e2) { console.error('Delete old stadiums error:', e2.message); process.exit(1) }
  }
  const { error: deleteTeamsErr } = await supabase.from('teams').delete().eq('sport', 'NWSL')
  if (deleteTeamsErr) { console.error('Delete teams error:', deleteTeamsErr.message); process.exit(1) }

  const { data: insertedTeams, error: teamsErr } = await supabase
    .from('teams')
    .insert(teamRecords)
    .select()

  if (teamsErr) { console.error('Teams error:', teamsErr.message); process.exit(1) }
  console.log(`✓ ${insertedTeams.length} teams inserted`)

  // Build team name → id map
  const { data: allTeams } = await supabase.from('teams').select('id, name').eq('sport', 'NWSL')
  const teamMap = Object.fromEntries(allTeams.map(t => [t.name, t.id]))

  // ── 2. Upsert stadiums ───────────────────────────────────────────────────────
  console.log('\n── Seeding stadiums ──')
  const stadiumRecords = []
  const teamsForStadiums = [
    ...teamsRaw,
    { Team: 'Washington Spirit', Stadium: 'Audi Field' },
  ]
  for (const t of teamsForStadiums) {
    const teamId = teamMap[t.Team]
    if (!teamId) { console.warn(`  No team id for: ${t.Team}`); continue }
    const coords = STADIUM_COORDS[t.Stadium]
    if (!coords) { console.warn(`  No coords for stadium: ${t.Stadium}`); continue }
    stadiumRecords.push({
      name: t.Stadium,
      team_id: teamId,
      lat: coords.lat,
      lon: coords.lon,
    })
  }

  // Delete old NWSL stadiums (by team_id)
  const nwslIds = insertedTeams.map(t => t.id)
  const { error: deleteStadiumsErr } = await supabase.from('stadiums').delete().in('team_id', nwslIds)
  if (deleteStadiumsErr) { console.error('Delete stadiums error:', deleteStadiumsErr.message); process.exit(1) }

  const { data: insertedStadiums, error: stadiumsErr } = await supabase
    .from('stadiums')
    .insert(stadiumRecords)
    .select()

  if (stadiumsErr) { console.error('Stadiums error:', stadiumsErr.message); process.exit(1) }
  console.log(`✓ ${insertedStadiums.length} stadiums inserted`)

  // ── 3. Upsert players ────────────────────────────────────────────────────────
  console.log('\n── Seeding players ──')

  let cardNumber = 1
  const playerRecords = []
  for (const p of playersRaw) {
    const canonicalTeam = p.Team  // nwls_players_with_photos.csv already uses canonical names
    const teamId = teamMap[canonicalTeam]
    if (!teamId) { console.warn(`  No team id for player team: "${p.Team}" → "${canonicalTeam}"`); continue }
    playerRecords.push({
      first_name: p.first_name,
      last_name: p.last_name || '',
      position: p.Pos || '',
      age: p.Age ? parseInt(p.Age, 10) : null,
      face_image: p.photo_url || null,
      team_id: teamId,
      card_number: cardNumber++,
    })
  }

  // Delete existing NWSL players first, then insert fresh
  const ids = insertedTeams.map(t => t.id)
  const { error: deleteErr } = await supabase.from('players').delete().in('team_id', ids)
  if (deleteErr) { console.error('Delete players error:', deleteErr.message); process.exit(1) }

  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < playerRecords.length; i += BATCH) {
    const batch = playerRecords.slice(i, i + BATCH)
    const { error } = await supabase.from('players').insert(batch)
    if (error) { console.error(`Batch ${i} error:`, error.message); process.exit(1) }
    inserted += batch.length
  }
  console.log(`✓ ${inserted} players inserted`)

  console.log('\n✅ Done! All NWSL data seeded.')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
