import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const rows = []
createReadStream(join(__dirname, '../data/players.csv'))
  .pipe(parse({ columns: true, trim: true }))
  .on('data', (row) => rows.push(row))
  .on('end', async () => {
    const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name')
    if (teamsErr) { console.error('Could not fetch teams:', teamsErr.message); process.exit(1) }
    const teamMap = Object.fromEntries(teams.map((t) => [t.name, t.id]))

    const records = rows.map((r, i) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      face_image: r.face_image || null,
      team_id: teamMap[r.team_name] ?? null,
      position: r.position || null,
      age: r.age ? parseInt(r.age) : null,
      height: r.height || null,
      weight: r.weight || null,
      card_number: r.card_number ? parseInt(r.card_number) : i + 1,
    }))

    const { data, error } = await supabase.from('players').upsert(records).select()
    if (error) { console.error('Error seeding players:', error.message); process.exit(1) }
    console.log(`✓ Inserted/updated ${data.length} players`)
  })
