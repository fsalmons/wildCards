export function getStravaAuthUrl() {
  const clientId = (import.meta.env.VITE_STRAVA_CLIENT_ID || '223711').trim()
  const redirectUri = (import.meta.env.VITE_STRAVA_REDIRECT_URI || 'https://stadium-card-collector.vercel.app/profile').trim()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'auto',
    scope: 'activity:read',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function syncStrava(userId) {
  try {
    const res = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}
