import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { challengerId, opponentId } = req.body || {}
  if (!challengerId || !opponentId) {
    return res.status(400).json({ error: 'Missing challengerId or opponentId' })
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    // Check both players have 15+ cards
    const [challengerCards, opponentCards] = await Promise.all([
      supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', challengerId),
      supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', opponentId),
    ])

    if ((challengerCards.count ?? 0) < 15) {
      return res.status(400).json({ error: 'You need at least 15 cards to compete' })
    }
    if ((opponentCards.count ?? 0) < 15) {
      return res.status(400).json({ error: 'Opponent needs at least 15 cards to compete' })
    }

    // Check no existing pending/active competition between them
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .or(
        `and(challenger_id.eq.${challengerId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${challengerId})`
      )
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'A competition already exists between these players' })
    }

    const { data: comp, error: insertError } = await supabase
      .from('competitions')
      .insert({
        challenger_id: challengerId,
        opponent_id: opponentId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[compete/challenge] insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create competition' })
    }

    return res.status(200).json({ competitionId: comp.id })
  } catch (err) {
    console.error('[compete/challenge] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
