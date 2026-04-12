import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { competitionId, userId, cardIds, lockedCardIds } = req.body || {}
  if (!competitionId || !userId || !Array.isArray(cardIds)) {
    return res.status(400).json({ error: 'Missing competitionId, userId, or cardIds' })
  }
  if (cardIds.length !== 5) {
    return res.status(400).json({ error: 'Must submit exactly 5 cards' })
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    // Fetch competition
    const { data: comp, error: compErr } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single()

    if (compErr || !comp) {
      return res.status(404).json({ error: 'Competition not found' })
    }
    if (comp.status !== 'active') {
      return res.status(400).json({ error: 'Competition is not active' })
    }

    const isChallenger = comp.challenger_id === userId
    if (!isChallenger && comp.opponent_id !== userId) {
      return res.status(403).json({ error: 'User is not part of this competition' })
    }

    // Fetch current round
    const { data: round, error: roundErr } = await supabase
      .from('competition_rounds')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('round_number', comp.current_round)
      .single()

    if (roundErr || !round) {
      return res.status(404).json({ error: 'Current round not found' })
    }

    // Check not already submitted
    const alreadySubmitted = isChallenger
      ? round.challenger_submitted
      : round.opponent_submitted
    if (alreadySubmitted) {
      return res.status(400).json({ error: 'Already submitted for this round' })
    }

    // Update round with submitted card IDs
    const cardIdsField = isChallenger ? 'challenger_card_ids' : 'opponent_card_ids'
    const submittedField = isChallenger ? 'challenger_submitted' : 'opponent_submitted'
    const lockInsField = isChallenger
      ? 'challenger_lock_ins_remaining'
      : 'opponent_lock_ins_remaining'
    const lockedCount = Array.isArray(lockedCardIds) ? lockedCardIds.length : 0
    const currentLockIns = isChallenger
      ? comp.challenger_lock_ins_remaining
      : comp.opponent_lock_ins_remaining
    const newLockIns = Math.max(0, currentLockIns - lockedCount)

    await supabase
      .from('competitions')
      .update({ [lockInsField]: newLockIns, updated_at: new Date().toISOString() })
      .eq('id', competitionId)

    await supabase
      .from('competition_rounds')
      .update({ [cardIdsField]: cardIds, [submittedField]: true })
      .eq('id', round.id)

    // Insert used cards
    if (cardIds.length > 0) {
      await supabase.from('competition_used_cards').insert(
        cardIds.map(ucId => ({
          competition_id: competitionId,
          user_id: userId,
          user_card_id: ucId,
          round_number: comp.current_round,
        }))
      )
    }

    // Check if both submitted
    const otherSubmitted = isChallenger
      ? round.opponent_submitted
      : round.challenger_submitted

    if (!otherSubmitted) {
      return res.status(200).json({ bothSubmitted: false })
    }

    // Both submitted — resolve round
    const allCardIds = [...cardIds, ...(isChallenger ? round.opponent_card_ids : round.challenger_card_ids)]
    const { data: userCards } = await supabase
      .from('user_cards')
      .select('id, rating')
      .in('id', allCardIds)

    const ratingMap = {}
    for (const uc of userCards || []) {
      ratingMap[uc.id] = uc.rating ?? 0
    }

    const myCardIds = cardIds
    const theirCardIds = isChallenger ? round.opponent_card_ids : round.challenger_card_ids

    const challengerCardIds = isChallenger ? myCardIds : theirCardIds
    const opponentCardIds = isChallenger ? theirCardIds : myCardIds

    const challengerTotal = challengerCardIds.reduce((s, id) => s + (ratingMap[id] ?? 0), 0)
    const opponentTotal = opponentCardIds.reduce((s, id) => s + (ratingMap[id] ?? 0), 0)

    let roundWinnerId = null
    if (challengerTotal > opponentTotal) roundWinnerId = comp.challenger_id
    else if (opponentTotal > challengerTotal) roundWinnerId = comp.opponent_id
    // tie: roundWinnerId stays null

    await supabase
      .from('competition_rounds')
      .update({
        challenger_total: challengerTotal,
        opponent_total: opponentTotal,
        winner_id: roundWinnerId,
      })
      .eq('id', round.id)

    // Update win counts
    let newChallengerWins = comp.challenger_wins
    let newOpponentWins = comp.opponent_wins
    if (roundWinnerId === comp.challenger_id) newChallengerWins++
    else if (roundWinnerId === comp.opponent_id) newOpponentWins++

    await supabase
      .from('competitions')
      .update({
        challenger_wins: newChallengerWins,
        opponent_wins: newOpponentWins,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitionId)

    // Check if series is over (best of 3 — first to 2 wins)
    if (newChallengerWins >= 2 || newOpponentWins >= 2) {
      const seriesWinnerId = newChallengerWins >= 2 ? comp.challenger_id : comp.opponent_id
      const seriesLoserId = newChallengerWins >= 2 ? comp.opponent_id : comp.challenger_id
      await supabase.rpc('resolve_series', {
        comp_id: competitionId,
        p_winner_id: seriesWinnerId,
        p_loser_id: seriesLoserId,
      })
    }

    return res.status(200).json({
      bothSubmitted: true,
      roundWinnerId,
      challengerTotal,
      opponentTotal,
    })
  } catch (err) {
    console.error('[compete/submit-round] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
