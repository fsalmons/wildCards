import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// =========================
// LOAD CSV
// =========================
const csvPath = join(__dirname, '../tables/team_colors.csv')
const lines = readFileSync(csvPath, 'utf8').trim().split('\n').slice(1)

const colorMap = lines.map(line => {
  const parts = line.split(',')

  const team = parts[0].trim()
  const colorsRaw = parts.slice(1).join(',').trim()

  let colors = []

  try {
    colors = JSON.parse(colorsRaw)
  } catch {
    colors = colorsRaw
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(s => s.trim())
  }

  return {
    team,
    primary: colors[0] || null,
    card: colors[1] || null,
    text: colors[2] || colors[0] || null,
  }
})

// =========================
// RUN
// =========================
async function run() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')

  if (error) {
    console.error('Failed to fetch teams:', error.message)
    process.exit(1)
  }

  console.log(`Found ${teams.length} teams in DB\n`)

  let updated = 0
  let skipped = 0

  for (const { team, primary, card, text } of colorMap) {

    // 🔥 STRICT MATCH ONLY (no fuzzy logic)
    const match = teams.find(t => t.name === team)

    if (!match) {
      console.log(`⚠️ No exact match for "${team}"`)
      skipped++
      continue
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({
        primary_color: primary,
        card_color: card,
        text_color: text,
      })
      .eq('id', match.id)

    if (updateErr) {
      console.error(`✗ ${match.name}: ${updateErr.message}`)
    } else {
      console.log(
        `✓ ${match.name}: primary=${primary}, card=${card}, text=${text}`
      )
      updated++
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`)
}

run()
