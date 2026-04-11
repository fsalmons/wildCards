import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, userId } = req.body || {}

  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or userId' })
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.VITE_STRAVA_REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[strava/callback] token exchange failed:', errText)
      return res.status(400).json({ error: 'Strava token exchange failed' })
    }

    const token = await tokenRes.json()

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    const { error: updateError } = await supabase
      .from('users')
      .update({
        strava_athlete_id: String(token.athlete.id),
        strava_access_token: token.access_token,
        strava_refresh_token: token.refresh_token,
        strava_token_expires_at: token.expires_at,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[strava/callback] supabase update error:', updateError)
      return res.status(500).json({ error: 'Failed to store Strava credentials' })
    }

    return res.status(200).json({ success: true, athleteName: token.athlete.firstname })
  } catch (err) {
    console.error('[strava/callback] unexpected error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
