import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const TEAM_LOGOS = {
  // ── Big Ten (ESPN CDN) ──────────────────────────────────────
  'Illinois Fighting Illini':  'https://a.espncdn.com/i/teamlogos/ncaa/500/356.png',
  'Indiana Hoosiers':          'https://a.espncdn.com/i/teamlogos/ncaa/500/84.png',
  'Iowa Hawkeyes':             'https://a.espncdn.com/i/teamlogos/ncaa/500/2294.png',
  'Maryland Terrapins':        'https://a.espncdn.com/i/teamlogos/ncaa/500/120.png',
  'Michigan Wolverines':       'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png',
  'Michigan State Spartans':   'https://a.espncdn.com/i/teamlogos/ncaa/500/127.png',
  'Minnesota Golden Gophers':  'https://a.espncdn.com/i/teamlogos/ncaa/500/135.png',
  'Nebraska Cornhuskers':      'https://a.espncdn.com/i/teamlogos/ncaa/500/158.png',
  'Northwestern Wildcats':     'https://a.espncdn.com/i/teamlogos/ncaa/500/77.png',
  'Ohio State Buckeyes':       'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png',
  'Oregon Ducks':              'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png',
  'Penn State Nittany Lions':  'https://a.espncdn.com/i/teamlogos/ncaa/500/213.png',
  'Purdue Boilermakers':       'https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png',
  'Rutgers Scarlet Knights':   'https://a.espncdn.com/i/teamlogos/ncaa/500/164.png',
  'UCLA Bruins':               'https://a.espncdn.com/i/teamlogos/ncaa/500/26.png',
  'USC Trojans':               'https://a.espncdn.com/i/teamlogos/ncaa/500/30.png',
  'Washington Huskies':        'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  'Wisconsin Badgers':         'https://a.espncdn.com/i/teamlogos/ncaa/500/275.png',

  // ── NWSL ────────────────────────────────────────────────────
  'Angel City FC':        'https://images.nwslsoccer.com/image/private/t_q-best/v1710436088/prd/assets/teams/angel-city-fc.svg',
  'Bay FC':               'https://images.nwslsoccer.com/image/private/t_q-best/v1710436090/prd/assets/teams/bay-fc.svg',
  'Chicago Stars FC':     'https://www.nwslsoccer.com/_next/image?url=https%3A%2F%2Fimages.nwslsoccer.com%2Fimage%2Fprivate%2Ft_q-best%2Fv1774457661%2Fprd%2Fassets%2Fteams%2Fchicago-stars.png&w=128&q=75',
  'Houston Dash':         'https://images.nwslsoccer.com/image/private/t_q-best/v1710436093/prd/assets/teams/houston-dash.svg',
  'Kansas City Current':  'https://images.nwslsoccer.com/image/private/t_q-best/v1710436094/prd/assets/teams/kansas-city-current.svg',
  'Gotham FC':            'https://www.nwslsoccer.com/_next/image?url=https%3A%2F%2Fimages.nwslsoccer.com%2Fimage%2Fprivate%2Ft_q-best%2Fv1768567024%2Fprd%2Fassets%2Fteams%2Fnj-ny-gotham-fc.png&w=128&q=75',
  'North Carolina Courage': 'https://images.nwslsoccer.com/image/private/t_q-best/v1712866345/prd/assets/teams/north-carolina-courage.svg',
  'Orlando Pride':        'https://images.nwslsoccer.com/image/private/t_q-best/v1710436099/prd/assets/teams/orlando-pride.svg',
  'Portland Thorns FC':   'https://images.nwslsoccer.com/image/private/t_q-best/v1710436101/prd/assets/teams/portland-thorns-fc.svg',
  'Racing Louisville FC': 'https://images.nwslsoccer.com/image/private/t_q-best/v1710436103/prd/assets/teams/racing-louisville-fc.svg',
  'San Diego Wave FC':    'https://images.nwslsoccer.com/image/private/t_q-best/v1710436105/prd/assets/teams/san-diego-wave-fc.svg',
  'Seattle Reign FC':     'https://images.nwslsoccer.com/image/private/t_q-best/v1710436107/prd/assets/teams/seattle-reign.svg',
  'Utah Royals':          'https://images.nwslsoccer.com/image/private/t_q-best/v1710436109/prd/assets/teams/utah-royals-fc.svg',
  'Washington Spirit':    'https://images.nwslsoccer.com/image/private/t_q-best/v1712866158/prd/assets/teams/washington-spirit.svg',
}

async function run() {
  const { data: teams, error } = await supabase.from('teams').select('id, name')
  if (error) { console.error('Failed to fetch teams:', error.message); process.exit(1) }
  console.log(`Found ${teams.length} teams in DB\n`)

  let updated = 0, skipped = 0

  for (const [name, logo_url] of Object.entries(TEAM_LOGOS)) {
    const match = teams.find(t => t.name === name)
    if (!match) { console.log(`  ⚠️  No DB match for "${name}"`); skipped++; continue }

    const { error: err } = await supabase
      .from('teams').update({ logo_url }).eq('id', match.id)

    if (err) { console.error(`  ✗  ${name}: ${err.message}`) }
    else { console.log(`  ✓  ${name}`); updated++ }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`)
}

run()
