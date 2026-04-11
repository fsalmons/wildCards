import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function seedUserCards() {
  // Fetch all users
  const { data: users, error: usersErr } = await supabase.from('users').select('id, username')
  if (usersErr) { console.error('Failed to fetch users:', usersErr.message); process.exit(1) }
  console.log(`Found ${users.length} users:`, users.map(u => u.username).join(', '))

  // Fetch all players
  const { data: players, error: playersErr } = await supabase.from('players').select('id, first_name, last_name')
  if (playersErr) { console.error('Failed to fetch players:', playersErr.message); process.exit(1) }
  console.log(`Found ${players.length} players`)

  // Give each user 10 random cards
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

  for (const user of users) {
    const picked = shuffle(players).slice(0, 10)
    const records = picked.map(p => ({ user_id: user.id, player_id: p.id }))
    const { error } = await supabase.from('user_cards').insert(records)
    if (error) {
      console.error(`Failed for ${user.username}:`, error.message)
    } else {
      console.log(`✓ Gave ${user.username} ${picked.length} cards: ${picked.map(p => p.first_name).join(', ')}`)
    }
  }
}

seedUserCards()
