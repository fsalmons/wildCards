import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { competitionId } = req.query
  if (!competitionId) {
    return res.status(400).json({ error: 'Missing competitionId' })
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    // Fetch competition
    const { data: competition, error: compErr } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single()

    if (compErr || !competition) {
      return res.status(404).json({ error: 'Competition not found' })
    }

    // Fetch current round
    const { data: currentRound } = await supabase
      .from('competition_rounds')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('round_number', competition.current_round)
      .maybeSingle()

    // Fetch used card IDs for each player
    const { data: usedCards } = await supabase
      .from('competition_used_cards')
      .select('user_id, user_card_id')
      .eq('competition_id', competitionId)

    const challengerUsed = []
    const opponentUsed = []
    for (const uc of usedCards || []) {
      if (uc.user_id === competition.challenger_id) {
        challengerUsed.push(uc.user_card_id)
      } else if (uc.user_id === competition.opponent_id) {
        opponentUsed.push(uc.user_card_id)
      }
    }

    return res.status(200).json({
      competition,
      currentRound: currentRound || null,
      usedCardIds: {
        challenger: challengerUsed,
        opponent: opponentUsed,
      },
    })
  } catch (err) {
    console.error('[compete/status] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
