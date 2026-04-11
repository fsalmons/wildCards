import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const rows = []
createReadStream(join(__dirname, '../data/teams.csv'))
  .pipe(parse({ columns: true, trim: true }))
  .on('data', (row) => rows.push(row))
  .on('end', async () => {
    const records = rows.map((r) => ({
      name: r.name,
      sport: r.sport,
      primary_color: r.primary_color,
    }))
    const { data, error } = await supabase.from('teams').insert(records).select()
    if (error) { console.error('Error seeding teams:', error.message); process.exit(1) }
    console.log(`✓ Inserted/updated ${data.length} teams`)
  })
