import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { haversineDistance } from '../lib/geolocation'
import { PackOpening } from '../components/PackOpening/PackOpening'

// Fix Leaflet default icon bug for Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// Custom retro stadium marker icon
const stadiumIcon = L.divIcon({
  html: `<div style="font-size:24px;line-height:1;">🏟️</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Walking sprite user position icon
const spriteIcon = L.divIcon({
  html: `<div class="walking-sprite">🚶</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

// Default fallback center shown before GPS resolves
const DEFAULT_CENTER = { lat: 41.8781, lng: -87.6298 }
const DEFAULT_ZOOM = 14
const PROXIMITY_THRESHOLD_METERS = 100

// Inner component: re-centers map whenever user position changes
function MapCenterer({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], map.getZoom())
  }, [pos, map])
  return null
}

export function MapPage() {
  const [userPos, setUserPos] = useState(null)       // { lat, lng } from real GPS
  const [stadiums, setStadiums] = useState([])
  const [nearbyStadium, setNearbyStadium] = useState(null)
  const [showPack, setShowPack] = useState(false)
  const [devPos, setDevPos] = useState(null)         // dev teleport override
  const [tapCount, setTapCount] = useState(0)
  const [showDevPanel, setShowDevPanel] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [loadingGps, setLoadingGps] = useState(true)
  const [loadingStadiums, setLoadingStadiums] = useState(true)
  const tapTimerRef = useRef(null)
  const watchIdRef = useRef(null)
  const navigate = useNavigate()

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem('scc_user')) navigate('/login')
  }, [navigate])

  // Load stadiums from Supabase joining team name + primary_color
  useEffect(() => {
    async function fetchStadiums() {
      setLoadingStadiums(true)
      const { data, error } = await supabase
        .from('stadiums')
        .select('*, team:teams(name, primary_color)')

      if (error) {
        console.error('Failed to load stadiums:', error.message)
        setStadiums([])
      } else {
        setStadiums(data ?? [])
      }
      setLoadingStadiums(false)
    }
    fetchStadiums()
  }, [])

  // Proximity check — extracted so it can be called from multiple effects
  const checkProximity = useCallback((pos, stadiumList) => {
    if (!pos || stadiumList.length === 0) {
      setNearbyStadium(null)
      return
    }
    const nearby = stadiumList.find(
      (s) => haversineDistance(pos.lat, pos.lng, s.lat, s.lng) <= PROXIMITY_THRESHOLD_METERS
    )
    setNearbyStadium(nearby ?? null)
  }, [])

  // GPS watchPosition — runs once on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      setLoadingGps(false)
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserPos(pos)
        setLoadingGps(false)
        setGpsError(null)
        // Only apply real GPS proximity when no dev override is active
        setDevPos((currentDevPos) => {
          if (!currentDevPos) {
            setStadiums((currentStadiums) => {
              checkProximity(pos, currentStadiums)
              return currentStadiums
            })
          }
          return currentDevPos
        })
      },
      (err) => {
        setLoadingGps(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location access denied. Enable it in your browser settings to play.')
            break
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location unavailable. Try moving to an area with better signal.')
            break
          case err.TIMEOUT:
            setGpsError('Location request timed out. Retrying…')
            break
          default:
            setGpsError('Unable to retrieve your location.')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [checkProximity])

  // Re-run proximity check when stadiums load or dev position changes
  useEffect(() => {
    const effectivePos = devPos ?? userPos
    checkProximity(effectivePos, stadiums)
  }, [stadiums, devPos, userPos, checkProximity])

  // Effective display position: dev override wins over real GPS
  const effectivePos = devPos ?? userPos

  // Dev panel: triple-tap invisible top-right corner to toggle
  function handleCornerTap() {
    if (!import.meta.env.DEV) return
    const next = tapCount + 1
    setTapCount(next)
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    if (next >= 3) {
      setShowDevPanel((v) => !v)
      setTapCount(0)
    } else {
      tapTimerRef.current = setTimeout(() => setTapCount(0), 800)
    }
  }

  function handleDevStadiumSelect(e) {
    const id = e.target.value
    if (!id) {
      setDevPos(null)
      // Fall back to real GPS proximity
      checkProximity(userPos, stadiums)
      return
    }
    const stadium = stadiums.find((s) => String(s.id) === id)
    if (stadium) {
      const pos = { lat: stadium.lat, lng: stadium.lng }
      setDevPos(pos)
      checkProximity(pos, stadiums)
    }
  }

  const mapCenter = effectivePos ?? DEFAULT_CENTER

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Leaflet map ── */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100dvh', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={19}
        />

        {/* Stadium markers */}
        {stadiums.map((stadium) => (
          <Marker
            key={stadium.id}
            position={[stadium.lat, stadium.lng]}
            icon={stadiumIcon}
          >
            <Popup>
              <div style={{ fontFamily: 'Fredoka One, sans-serif', minWidth: 160 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: stadium.team?.primary_color ?? '#8B4513',
                    marginBottom: 2,
                  }}
                >
                  {stadium.team?.name ?? 'Unknown Team'}
                </div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                  {stadium.name}
                </div>
                {effectivePos && (
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {(() => {
                      const dist = haversineDistance(
                        effectivePos.lat,
                        effectivePos.lng,
                        stadium.lat,
                        stadium.lng
                      )
                      return dist < 1000
                        ? `${Math.round(dist)} m away`
                        : `${(dist / 1000).toFixed(1)} km away`
                    })()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Walking sprite at user position */}
        {effectivePos && (
          <Marker
            position={[effectivePos.lat, effectivePos.lng]}
            icon={spriteIcon}
          />
        )}

        {/* Keep map view centered on user */}
        {effectivePos && <MapCenterer pos={effectivePos} />}
      </MapContainer>

      {/* ── GPS acquiring toast ── */}
      {loadingGps && !gpsError && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(245,236,215,0.95)',
            border: '2px solid #8B4513',
            borderRadius: 10,
            padding: '8px 18px',
            fontFamily: 'Fredoka One, sans-serif',
            fontSize: 14,
            color: '#8B4513',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Finding your location…
        </div>
      )}

      {/* ── GPS error banner ── */}
      {gpsError && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            right: 16,
            background: '#fff3cd',
            border: '2px solid #d97706',
            borderRadius: 10,
            padding: '10px 16px',
            fontFamily: 'Fredoka One, sans-serif',
            fontSize: 14,
            color: '#92400e',
            zIndex: 1000,
            textAlign: 'center',
          }}
        >
          {gpsError}
        </div>
      )}

      {/* ── Open Pack button — wrapper handles centering, button handles pulse ── */}
      {nearbyStadium && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
        >
          <button
            className="pack-btn-pulse"
            style={{
              background: '#8B4513',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 12,
              fontSize: 18,
              fontFamily: 'Fredoka One, sans-serif',
              cursor: 'pointer',
              display: 'block',
            }}
            onClick={() => setShowPack(true)}
          >
            Open Pack 🎴
          </button>
        </div>
      )}

      {/* ── PackOpening modal ── */}
      {showPack && (
        <PackOpening
          stadium={nearbyStadium}
          onClose={() => setShowPack(false)}
        />
      )}

      {/* ── Dev-only: invisible triple-tap zone in top-right corner ── */}
      {import.meta.env.DEV && (
        <div
          onClick={handleCornerTap}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 60,
            height: 60,
            zIndex: 2000,
          }}
        />
      )}

      {/* ── Dev panel: teleport dropdown ── */}
      {import.meta.env.DEV && showDevPanel && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            background: 'rgba(245,236,215,0.97)',
            border: '2px solid #8B4513',
            borderRadius: 10,
            padding: '10px 14px',
            zIndex: 2001,
            fontFamily: 'Fredoka One, sans-serif',
            fontSize: 13,
            color: '#8B4513',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
            minWidth: 210,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Dev: Teleport to Stadium
          </div>

          {loadingStadiums ? (
            <div style={{ color: '#aaa' }}>Loading stadiums…</div>
          ) : stadiums.length === 0 ? (
            <div style={{ color: '#aaa' }}>No stadiums in DB yet.</div>
          ) : (
            <select
              onChange={handleDevStadiumSelect}
              defaultValue=""
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: 6,
                border: '1px solid #8B4513',
                fontFamily: 'Fredoka One, sans-serif',
                fontSize: 13,
                color: '#8B4513',
                background: '#FFF8EE',
                cursor: 'pointer',
              }}
            >
              <option value="">— use real GPS —</option>
              {stadiums.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.team?.name ? `${s.team.name} – ` : ''}
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowDevPanel(false)}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 'none',
              color: '#8B4513',
              cursor: 'pointer',
              fontSize: 12,
              textDecoration: 'underline',
              padding: 0,
              fontFamily: 'Fredoka One, sans-serif',
            }}
          >
            close
          </button>
        </div>
      )}
    </div>
  )
}
