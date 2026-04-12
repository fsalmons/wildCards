/**
 * Cleanup script:
 * 1. Remove players with no face_image (and their user_cards/trades)
 * 2. Remove all users (and their user_cards/trades/friendships/strava_activities)
 * Run: node scripts/cleanup.js
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  // ── 1. Delete all trades (references user_cards) ────────────────────────────
  console.log('Deleting all trades...')
  const { error: e1 } = await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e1) { console.error('trades:', e1.message); process.exit(1) }
  console.log('✓ trades cleared')

  // ── 1b. Null out active_card_id on all users first ──────────────────────────
  console.log('Clearing active_card_id on users...')
  const { error: e1b } = await supabase.from('users').update({ active_card_id: null }).neq('id', '00000000-0000-0000-0000-000000000000')
  if (e1b) { console.error('clear active_card_id:', e1b.message); process.exit(1) }
  console.log('✓ active_card_id cleared')

  // ── 2. Delete all user_cards ────────────────────────────────────────────────
  console.log('Deleting all user_cards...')
  const { error: e2 } = await supabase.from('user_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e2) { console.error('user_cards:', e2.message); process.exit(1) }
  console.log('✓ user_cards cleared')

  // ── 3. Delete all friendships ───────────────────────────────────────────────
  console.log('Deleting all friendships...')
  const { error: e3 } = await supabase.from('friendships').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e3) { console.error('friendships:', e3.message); process.exit(1) }
  console.log('✓ friendships cleared')

  // ── 4. Delete all strava_activities ─────────────────────────────────────────
  console.log('Deleting all strava_activities...')
  const { error: e4 } = await supabase.from('strava_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e4) { console.error('strava_activities:', e4.message); process.exit(1) }
  console.log('✓ strava_activities cleared')

  // ── 5. Delete all users ──────────────────────────────────────────────────────
  console.log('Deleting all users...')
  const { error: e5 } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (e5) { console.error('users:', e5.message); process.exit(1) }
  console.log('✓ users cleared')

  // ── 6. Delete players with no face_image ────────────────────────────────────
  console.log('Deleting players with no face_image...')
  const { data: faceless, error: fe } = await supabase
    .from('players')
    .select('id')
    .or('face_image.is.null,face_image.eq.')
  if (fe) { console.error('fetch faceless:', fe.message); process.exit(1) }
  console.log(`  Found ${faceless.length} players without a face`)

  if (faceless.length > 0) {
    const ids = faceless.map(p => p.id)
    const { error: e6 } = await supabase.from('players').delete().in('id', ids)
    if (e6) { console.error('delete players:', e6.message); process.exit(1) }
  }
  console.log('✓ faceless players removed')

  // ── Summary ──────────────────────────────────────────────────────────────────
  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Done. ${count} players remain in DB (all with face images).`)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
