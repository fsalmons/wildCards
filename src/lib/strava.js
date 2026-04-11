export function getStravaAuthUrl() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: import.meta.env.VITE_STRAVA_REDIRECT_URI,
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
