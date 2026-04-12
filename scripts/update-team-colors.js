import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// Parse the team_colors.csv
const csvPath = join(__dirname, '../tables/team_colors.csv')
const lines = readFileSync(csvPath, 'utf8').trim().split('\n').slice(1) // skip header

const colorMap = lines.map(line => {
  const [team, primary, text] = line.split(',').map(s => s.trim())
  return { team, primary, text }
})

// Aliases for teams whose DB name differs from the CSV name
const ALIASES = {
  'Thorns FC': 'Portland Thorns',
  'Chicago Stars FC': 'Chicago Stars',
}

async function run() {
  const { data: teams, error } = await supabase.from('teams').select('id, name')
  if (error) { console.error('Failed to fetch teams:', error.message); process.exit(1) }
  console.log(`Found ${teams.length} teams in DB\n`)

  let updated = 0
  let skipped = 0

  for (const { team: csvName, primary, text } of colorMap) {
    const lookupName = ALIASES[csvName] ?? csvName

    // Exact match first, then case-insensitive contains
    const match =
      teams.find(t => t.name === lookupName) ??
      teams.find(t => t.name.toLowerCase().includes(lookupName.toLowerCase())) ??
      teams.find(t => lookupName.toLowerCase().includes(t.name.toLowerCase()))

    if (!match) {
      console.log(`  ⚠️  No DB match for "${csvName}" (tried "${lookupName}")`)
      skipped++
      continue
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({ primary_color: primary, text_color: text })
      .eq('id', match.id)

    if (updateErr) {
      console.error(`  ✗  ${match.name}: ${updateErr.message}`)
    } else {
      console.log(`  ✓  ${match.name}: bg=${primary} text=${text}`)
      updated++
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped (no DB match).`)
}

run()
