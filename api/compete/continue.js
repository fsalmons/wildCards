import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { competitionId, userId } = req.body || {}
  if (!competitionId || !userId) {
    return res.status(400).json({ error: 'Missing competitionId or userId' })
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: comp, error: compErr } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single()

    if (compErr || !comp) {
      return res.status(404).json({ error: 'Competition not found' })
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

    const continuedField = isChallenger ? 'challenger_continued' : 'opponent_continued'
    await supabase
      .from('competition_rounds')
      .update({ [continuedField]: true })
      .eq('id', round.id)

    const otherContinued = isChallenger
      ? round.opponent_continued
      : round.challenger_continued

    if (!otherContinued) {
      return res.status(200).json({ bothContinued: false })
    }

    // Both continued — if series not complete, start next round
    if (comp.status === 'complete') {
      return res.status(200).json({ bothContinued: true })
    }

    const nextRound = comp.current_round + 1
    await supabase
      .from('competitions')
      .update({ current_round: nextRound, updated_at: new Date().toISOString() })
      .eq('id', competitionId)

    await supabase.from('competition_rounds').insert({
      competition_id: competitionId,
      round_number: nextRound,
    })

    return res.status(200).json({ bothContinued: true, nextRound })
  } catch (err) {
    console.error('[compete/continue] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
