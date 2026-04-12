/**
 * Seed Big Ten teams, stadiums, and players from GitHub tables/.
 * Run: node scripts/seed-big-ten.js
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

const STADIUM_COORDS = {
  'State Farm Center':     { lat: 40.0960,  lon: -88.2357  },
  'Assembly Hall':         { lat: 39.1735,  lon: -86.5170  },
  'Carver-Hawkeye Arena':  { lat: 41.6613,  lon: -91.5489  },
  'XFINITY Center':        { lat: 38.9847,  lon: -76.9428  },
  'Crisler Center':        { lat: 42.2780,  lon: -83.7481  },
  'Breslin Center':        { lat: 42.7281,  lon: -84.4817  },
  'Williams Arena':        { lat: 44.9749,  lon: -93.2262  },
  'Pinnacle Bank Arena':   { lat: 40.8168,  lon: -96.7073  },
  'Welsh-Ryan Arena':      { lat: 42.0593,  lon: -87.6720  },
  'Schottenstein Center':  { lat: 40.0037,  lon: -83.0210  },
  'Matthew Knight Arena':  { lat: 44.0492,  lon: -123.0718 },
  'Bryce Jordan Center':   { lat: 40.7993,  lon: -77.8596  },
  'Mackey Arena':          { lat: 40.4325,  lon: -86.9210  },
  "Jersey Mike's Arena":   { lat: 40.5234,  lon: -74.4387  },
  'Pauley Pavilion':       { lat: 34.0720,  lon: -118.4483 },
  'Galen Center':          { lat: 34.0229,  lon: -118.2794 },
  'Alaska Airlines Arena': { lat: 47.6530,  lon: -122.3040 },
  'Kohl Center':           { lat: 43.0726,  lon: -89.4125  },
}

const TEAM_COLORS = {
  'Illinois Fighting Illini':   '#FF5F05',
  'Indiana Hoosiers':           '#990000',
  'Iowa Hawkeyes':              '#FFCD00',
  'Maryland Terrapins':         '#E03A3E',
  'Michigan Wolverines':        '#00274C',
  'Michigan State Spartans':    '#18453B',
  'Minnesota Golden Gophers':   '#7A0019',
  'Nebraska Cornhuskers':       '#E41C38',
  'Northwestern Wildcats':      '#4E2A84',
  'Ohio State Buckeyes':        '#BB0000',
  'Oregon Ducks':               '#154733',
  'Penn State Nittany Lions':   '#041E42',
  'Purdue Boilermakers':        '#8E6F3E',
  'Rutgers Scarlet Knights':    '#CC0033',
  'UCLA Bruins':                '#2D68C4',
  'USC Trojans':                '#9D2235',
  'Washington Huskies':         '#4B2E83',
  'Wisconsin Badgers':          '#C5050C',
}

async function run() {
  console.log('Fetching Big Ten CSV data from GitHub…')

  const [teamsText, playersText] = await Promise.all([
    fetchCSV('https://raw.githubusercontent.com/fsalmons/wildCards/main/tables/big_ten_teams.csv'),
    fetchCSV('https://raw.githubusercontent.com/fsalmons/wildCards/main/tables/big_ten_players.csv'),
  ])

  const teamsRaw = parseCSV(teamsText)
  const playersRaw = parseCSV(playersText)
  console.log(`Parsed ${teamsRaw.length} teams, ${playersRaw.length} players`)

  // ── 1. Clean up existing CBB data ────────────────────────────────────────────
  console.log('\n── Cleaning up existing CBB data ──')
  const { data: existingCBB } = await supabase.from('teams').select('id').eq('sport', 'CBB')
  const existingIds = (existingCBB ?? []).map(t => t.id)

  if (existingIds.length > 0) {
    const { data: oldPlayers } = await supabase.from('players').select('id').in('team_id', existingIds)
    const oldPlayerIds = (oldPlayers ?? []).map(p => p.id)
    if (oldPlayerIds.length > 0) {
      const { data: oldUC } = await supabase.from('user_cards').select('id').in('player_id', oldPlayerIds)
      const oldUCIds = (oldUC ?? []).map(c => c.id)
      if (oldUCIds.length > 0) {
        await supabase.from('trades').delete().in('offered_card_id', oldUCIds)
        await supabase.from('trades').delete().in('requested_card_id', oldUCIds)
      }
      await supabase.from('user_cards').delete().in('player_id', oldPlayerIds)
    }
    await supabase.from('players').delete().in('team_id', existingIds)
    await supabase.from('stadiums').delete().in('team_id', existingIds)
  }
  const { error: delTeamsErr } = await supabase.from('teams').delete().eq('sport', 'CBB')
  if (delTeamsErr) { console.error('Delete CBB teams error:', delTeamsErr.message); process.exit(1) }
  console.log('✓ Old CBB data cleared')

  // ── 2. Insert teams ───────────────────────────────────────────────────────────
  console.log('\n── Seeding teams ──')
  const teamRecords = teamsRaw.map(t => ({
    name: t.full_name,
    sport: 'CBB',
    primary_color: TEAM_COLORS[t.full_name] ?? '#8B4513',
  }))

  const { data: insertedTeams, error: teamsErr } = await supabase
    .from('teams').insert(teamRecords).select()
  if (teamsErr) { console.error('Teams error:', teamsErr.message); process.exit(1) }
  console.log(`✓ ${insertedTeams.length} teams inserted`)

  const teamMap = Object.fromEntries(insertedTeams.map(t => [t.name, t.id]))

  // ── 3. Insert stadiums ────────────────────────────────────────────────────────
  console.log('\n── Seeding stadiums ──')
  const stadiumRecords = []
  for (const t of teamsRaw) {
    const teamId = teamMap[t.full_name]
    if (!teamId) { console.warn(`  No team id for: ${t.full_name}`); continue }
    const coords = STADIUM_COORDS[t.stadium]
    if (!coords) { console.warn(`  No coords for: ${t.stadium}`); continue }
    stadiumRecords.push({ name: t.stadium, team_id: teamId, lat: coords.lat, lon: coords.lon })
  }

  const { data: insertedStadiums, error: stadiumsErr } = await supabase
    .from('stadiums').insert(stadiumRecords).select()
  if (stadiumsErr) { console.error('Stadiums error:', stadiumsErr.message); process.exit(1) }
  console.log(`✓ ${insertedStadiums.length} stadiums inserted`)

  // ── 4. Insert players ─────────────────────────────────────────────────────────
  console.log('\n── Seeding players ──')

  // Get current max card_number to continue sequence from NWSL
  const { data: maxCard } = await supabase
    .from('players').select('card_number').order('card_number', { ascending: false }).limit(1)
  let cardNumber = (maxCard?.[0]?.card_number ?? 0) + 1

  const playerRecords = []
  for (const p of playersRaw) {
    if (!p.photo_url) continue   // skip players without photos
    const teamId = teamMap[p.team]
    if (!teamId) { console.warn(`  No team id for player team: "${p.team}"`); continue }
    playerRecords.push({
      first_name: p.first_name,
      last_name: p.last_name || '',
      position: p.pos || '',
      age: p.age ? parseInt(p.age, 10) : null,
      face_image: p.photo_url || null,
      team_id: teamId,
      card_number: cardNumber++,
    })
  }

  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < playerRecords.length; i += BATCH) {
    const { error } = await supabase.from('players').insert(playerRecords.slice(i, i + BATCH))
    if (error) { console.error(`Batch ${i} error:`, error.message); process.exit(1) }
    inserted += playerRecords.slice(i, i + BATCH).length
  }
  console.log(`✓ ${inserted} players inserted`)

  console.log('\n✅ Done! All Big Ten data seeded.')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
