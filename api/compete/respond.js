import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { competitionId, userId, action } = req.body || {}
  if (!competitionId || !userId || !action) {
    return res.status(400).json({ error: 'Missing competitionId, userId, or action' })
  }
  if (action !== 'accept' && action !== 'reject') {
    return res.status(400).json({ error: 'action must be accept or reject' })
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    // Fetch competition to validate
    const { data: comp, error: fetchError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single()

    if (fetchError || !comp) {
      return res.status(404).json({ error: 'Competition not found' })
    }
    if (comp.opponent_id !== userId) {
      return res.status(403).json({ error: 'Only the opponent can respond' })
    }
    if (comp.status !== 'pending') {
      return res.status(400).json({ error: 'Competition is not pending' })
    }

    if (action === 'reject') {
      await supabase
        .from('competitions')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', competitionId)
      return res.status(200).json({ ok: true })
    }

    // Accept: set active + insert round 1
    await supabase
      .from('competitions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', competitionId)

    const { error: roundError } = await supabase
      .from('competition_rounds')
      .insert({
        competition_id: competitionId,
        round_number: 1,
      })

    if (roundError) {
      console.error('[compete/respond] round insert error:', roundError)
      return res.status(500).json({ error: 'Failed to create round' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[compete/respond] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
