import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const rows = []
createReadStream(join(__dirname, '../data/stadiums.csv'))
  .pipe(parse({ columns: true, trim: true }))
  .on('data', (row) => rows.push(row))
  .on('end', async () => {
    // Resolve team_id from team name
    const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name')
    if (teamsErr) { console.error('Could not fetch teams:', teamsErr.message); process.exit(1) }
    const teamMap = Object.fromEntries(teams.map((t) => [t.name, t.id]))

    const records = rows.map((r) => ({
      name: r.name,
      team_id: teamMap[r.team_name] ?? null,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }))

    const { data, error } = await supabase.from('stadiums').insert(records).select()
    if (error) { console.error('Error seeding stadiums:', error.message); process.exit(1) }
    console.log(`✓ Inserted/updated ${data.length} stadiums`)
  })
