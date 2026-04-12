import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  // 1. Upsert master user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'master')
    .maybeSingle()

  let userId
  if (existing) {
    userId = existing.id
    console.log(`Found existing master account: ${userId}`)
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({ username: 'master' })
      .select('id')
      .single()
    if (error) { console.error('Failed to create master user:', error.message); process.exit(1) }
    userId = created.id
    console.log(`Created master account: ${userId}`)
  }

  // 2. Fetch all players
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id')
  if (playersErr) { console.error('Failed to fetch players:', playersErr.message); process.exit(1) }
  console.log(`Found ${players.length} players`)

  // 3. Find which players master already has
  const { data: owned } = await supabase
    .from('user_cards')
    .select('player_id')
    .eq('user_id', userId)
  const ownedIds = new Set((owned ?? []).map(r => r.player_id))

  const missing = players.filter(p => !ownedIds.has(p.id))
  console.log(`Master owns ${ownedIds.size}, missing ${missing.length}`)

  // 4. Insert missing cards at 99 rating
  if (missing.length > 0) {
    const records = missing.map(p => ({
      user_id: userId,
      player_id: p.id,
      rating: 99,
      collected_at: new Date().toISOString(),
    }))

    // Insert in batches of 200 to stay under Supabase request limits
    const BATCH = 200
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      const { error } = await supabase.from('user_cards').insert(batch)
      if (error) { console.error(`Batch ${i / BATCH + 1} failed:`, error.message); process.exit(1) }
      console.log(`  inserted batch ${i / BATCH + 1} (${batch.length} cards)`)
    }
  }

  // 5. Upgrade any existing cards below 99
  if (ownedIds.size > 0) {
    const { error } = await supabase
      .from('user_cards')
      .update({ rating: 99 })
      .eq('user_id', userId)
      .lt('rating', 99)
    if (error) { console.error('Failed to upgrade existing cards:', error.message); process.exit(1) }
    console.log('Upgraded any sub-99 cards to 99')
  }

  console.log(`\nDone. master has all ${players.length} players at 99 OVR.`)
}

run()
