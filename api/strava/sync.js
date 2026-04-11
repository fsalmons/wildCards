import { createClient } from '@supabase/supabase-js'

async function refreshStravaToken(refreshToken) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body || {}

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  try {
    // 1. Fetch user with all strava fields
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, strava_athlete_id, strava_access_token, strava_refresh_token, strava_token_expires_at, active_card_id, total_exercise_minutes, total_rating_points_earned, last_strava_sync_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!user.strava_athlete_id) {
      return res.status(400).json({ error: 'Strava not connected' })
    }

    let accessToken = user.strava_access_token

    // 2. Refresh token if expired
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (user.strava_token_expires_at && user.strava_token_expires_at <= nowSeconds) {
      const refreshed = await refreshStravaToken(user.strava_refresh_token)
      if (!refreshed) {
        return res.status(400).json({ error: 'Failed to refresh Strava token' })
      }
      accessToken = refreshed.access_token
      await supabase
        .from('users')
        .update({
          strava_access_token: refreshed.access_token,
          strava_refresh_token: refreshed.refresh_token,
          strava_token_expires_at: refreshed.expires_at,
        })
        .eq('id', userId)
    }

    // 3. Fetch activities since last sync
    const afterEpoch = user.last_strava_sync_at
      ? Math.floor(new Date(user.last_strava_sync_at).getTime() / 1000)
      : 0

    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!activitiesRes.ok) {
      return res.status(400).json({ error: 'Failed to fetch Strava activities' })
    }

    const activities = await activitiesRes.json()

    if (!activities || activities.length === 0) {
      await supabase.from('users').update({ last_strava_sync_at: new Date().toISOString() }).eq('id', userId)
      return res.status(200).json({ minutesSynced: 0, newRating: null })
    }

    // 4. Filter already-processed activity IDs
    const activityIds = activities.map((a) => a.id)
    const { data: existing } = await supabase
      .from('strava_activities')
      .select('strava_activity_id')
      .in('strava_activity_id', activityIds)

    const existingIds = new Set((existing || []).map((r) => r.strava_activity_id))
    const newActivities = activities.filter((a) => !existingIds.has(a.id))

    // 5. Sum elapsed_time for new activities
    const newMinutes = newActivities.reduce((sum, a) => sum + Math.floor((a.elapsed_time || 0) / 60), 0)

    let newRating = null

    // 6. Update card rating if user has active_card_id
    if (newMinutes > 0 && user.active_card_id) {
      const { data: cardData } = await supabase
        .from('user_cards')
        .select('id, rating')
        .eq('id', user.active_card_id)
        .single()

      if (cardData) {
        newRating = Math.min(99, (cardData.rating || 50) + newMinutes)
        await supabase
          .from('user_cards')
          .update({ rating: newRating })
          .eq('id', user.active_card_id)
      }
    }

    // 7. Insert new activities
    if (newActivities.length > 0) {
      const rows = newActivities.map((a) => ({
        user_id: userId,
        strava_activity_id: a.id,
        elapsed_minutes: Math.floor((a.elapsed_time || 0) / 60),
      }))
      await supabase.from('strava_activities').insert(rows)
    }

    // 8. Update user totals
    await supabase
      .from('users')
      .update({
        total_exercise_minutes: (user.total_exercise_minutes || 0) + newMinutes,
        total_rating_points_earned: (user.total_rating_points_earned || 0) + newMinutes,
        last_strava_sync_at: new Date().toISOString(),
      })
      .eq('id', userId)

    return res.status(200).json({ minutesSynced: newMinutes, newRating })
  } catch (err) {
    console.error('[strava/sync] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
