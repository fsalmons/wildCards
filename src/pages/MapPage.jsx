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

// Stadium pin icon — bold red teardrop SVG
function makeStadiumIcon(isNearby) {
  const color = isNearby ? '#FF6B35' : '#8B4513'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0 C7.16 0 0 7.16 0 16 C0 26 16 40 16 40 C16 40 32 26 32 16 C32 7.16 24.84 0 16 0Z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" fill="white">🏟</text>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

// Walking sprite user position icon
const spriteIcon = L.divIcon({
  html: `<div class="walking-sprite">🚶</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const DEFAULT_CENTER = { lat: 41.8781, lng: -87.6298 }
const DEFAULT_ZOOM = 17
const PROXIMITY_THRESHOLD_METERS = 100

// Lock zoom and re-center on user position
function MapController({ pos }) {
  const map = useMap()
  useEffect(() => {
    map.setMinZoom(17)
    map.setMaxZoom(17)
    map.scrollWheelZoom.disable()
    map.doubleClickZoom.disable()
    map.touchZoom.disable()
    map.boxZoom.disable()
    map.keyboard.disable()
  }, [map])

  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], 17, { animate: true })
  }, [pos, map])

  return null
}

export function MapPage() {
  const [userPos, setUserPos] = useState(null)
  const [stadiums, setStadiums] = useState([])
  const [nearbyStadium, setNearbyStadium] = useState(null)
  const [showPack, setShowPack] = useState(false)
  const [packStadium, setPackStadium] = useState(null)
  const [devPos, setDevPos] = useState(null)
  const [tapCount, setTapCount] = useState(0)
  const [showDevPanel, setShowDevPanel] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [loadingGps, setLoadingGps] = useState(true)
  const [loadingStadiums, setLoadingStadiums] = useState(true)
  const tapTimerRef = useRef(null)
  const watchIdRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('scc_user')) navigate('/login')
  }, [navigate])

  useEffect(() => {
    async function fetchStadiums() {
      const { data, error } = await supabase
        .from('stadiums')
        .select('*, team:teams(name, primary_color)')
      if (error) { console.error('Failed to load stadiums:', error.message); setStadiums([]) }
      else setStadiums(data ?? [])
      setLoadingStadiums(false)
    }
    fetchStadiums()
  }, [])

  const checkProximity = useCallback((pos, stadiumList) => {
    if (!pos || stadiumList.length === 0) { setNearbyStadium(null); return }
    const nearby = stadiumList.find(
      (s) => haversineDistance(pos.lat, pos.lng, s.lat, s.lon ?? s.lng) <= PROXIMITY_THRESHOLD_METERS
    )
    setNearbyStadium(nearby ?? null)
  }, [])

  // GPS — maximumAge:0 for fastest updates
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported.')
      setLoadingGps(false)
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserPos(pos)
        setLoadingGps(false)
        setGpsError(null)
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
        if (err.code === err.PERMISSION_DENIED)
          setGpsError('Location access denied. Enable it in settings.')
        else if (err.code === err.POSITION_UNAVAILABLE)
          setGpsError('Location unavailable. Try moving outside.')
        else
          setGpsError('Unable to get your location.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [checkProximity])

  useEffect(() => {
    checkProximity(devPos ?? userPos, stadiums)
  }, [stadiums, devPos, userPos, checkProximity])

  const effectivePos = devPos ?? userPos
  const mapCenter = effectivePos ?? DEFAULT_CENTER

  function handleStadiumTap(stadium) {
    const dist = effectivePos
      ? haversineDistance(effectivePos.lat, effectivePos.lng, stadium.lat, stadium.lon ?? stadium.lng)
      : Infinity
    if (dist <= PROXIMITY_THRESHOLD_METERS) {
      setPackStadium(stadium)
      setShowPack(true)
    }
  }

  function handleCornerTap() {
    if (!import.meta.env.DEV) return
    const next = tapCount + 1
    setTapCount(next)
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    if (next >= 3) { setShowDevPanel((v) => !v); setTapCount(0) }
    else tapTimerRef.current = setTimeout(() => setTapCount(0), 800)
  }

  function handleDevStadiumSelect(e) {
    const id = e.target.value
    if (!id) { setDevPos(null); checkProximity(userPos, stadiums); return }
    const stadium = stadiums.find((s) => String(s.id) === id)
    if (stadium) {
      const pos = { lat: stadium.lat, lng: stadium.lon ?? stadium.lng }
      setDevPos(pos)
      checkProximity(pos, stadiums)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── WildCards header ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(139,69,19,0.92)',
        padding: '10px 16px',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{
          color: 'white', fontSize: 20, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          WildCards
        </span>
      </div>

      {/* ── Leaflet map ── */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        dragging={true}
        attributionControl={false}
      >
        {/* CartoDB Positron — minimal detail, clean look */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
          maxZoom={20}
        />

        {stadiums.map((stadium) => {
          const dist = effectivePos
            ? haversineDistance(effectivePos.lat, effectivePos.lng, stadium.lat, stadium.lon ?? stadium.lng)
            : Infinity
          const isNearby = dist <= PROXIMITY_THRESHOLD_METERS
          return (
            <Marker
              key={stadium.id}
              position={[stadium.lat, stadium.lon ?? stadium.lng]}
              icon={makeStadiumIcon(isNearby)}
              eventHandlers={{ click: () => handleStadiumTap(stadium) }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: stadium.team?.primary_color ?? '#8B4513', marginBottom: 2 }}>
                    {stadium.team?.name ?? 'Unknown Team'}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{stadium.name}</div>
                  {effectivePos && (
                    <div style={{ fontSize: 12, color: isNearby ? '#16a34a' : '#888', fontWeight: isNearby ? 700 : 400 }}>
                      {dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1000).toFixed(1)}km away`}
                      {isNearby && ' — Tap to open pack! 🎴'}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {effectivePos && (
          <Marker position={[effectivePos.lat, effectivePos.lng]} icon={spriteIcon} />
        )}

        <MapController pos={effectivePos} />
      </MapContainer>

      {/* ── GPS acquiring toast ── */}
      {loadingGps && !gpsError && (
        <div style={{
          position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,236,215,0.95)', border: '2px solid #8B4513',
          borderRadius: 10, padding: '8px 18px', fontSize: 13, color: '#8B4513',
          zIndex: 1001, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          Finding your location…
        </div>
      )}

      {/* ── GPS error banner ── */}
      {gpsError && (
        <div style={{
          position: 'absolute', top: 56, left: 16, right: 16,
          background: '#fff3cd', border: '2px solid #d97706',
          borderRadius: 10, padding: '10px 16px', fontSize: 13,
          color: '#92400e', zIndex: 1001, textAlign: 'center',
        }}>
          {gpsError}
        </div>
      )}

      {/* ── Open Pack button (also shown when nearby, as fallback) ── */}
      {nearbyStadium && !showPack && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%',
          transform: 'translateX(-50%)', zIndex: 1001,
        }}>
          <button
            className="pack-btn-pulse"
            style={{
              background: '#8B4513', color: 'white', border: 'none',
              padding: '14px 32px', borderRadius: 14, fontSize: 18,
              fontWeight: 800, cursor: 'pointer', display: 'block',
              boxShadow: '0 4px 0 #5C2A00',
            }}
            onClick={() => { setPackStadium(nearbyStadium); setShowPack(true) }}
          >
            Open Pack 🎴
          </button>
        </div>
      )}

      {/* ── PackOpening modal ── */}
      {showPack && (
        <PackOpening stadium={packStadium ?? nearbyStadium} onClose={() => { setShowPack(false); setPackStadium(null) }} />
      )}

      {/* ── Dev triple-tap zone ── */}
      {import.meta.env.DEV && (
        <div onClick={handleCornerTap} style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, zIndex: 2000 }} />
      )}

      {/* ── Dev teleport panel ── */}
      {import.meta.env.DEV && showDevPanel && (
        <div style={{
          position: 'absolute', top: 56, right: 12,
          background: 'rgba(245,236,215,0.97)', border: '2px solid #8B4513',
          borderRadius: 10, padding: '10px 14px', zIndex: 2001,
          fontSize: 13, color: '#8B4513', boxShadow: '2px 2px 8px rgba(0,0,0,0.2)', minWidth: 210,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Dev: Teleport to Stadium</div>
          {loadingStadiums ? <div style={{ color: '#aaa' }}>Loading…</div> : stadiums.length === 0 ? (
            <div style={{ color: '#aaa' }}>No stadiums in DB.</div>
          ) : (
            <select onChange={handleDevStadiumSelect} defaultValue=""
              style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid #8B4513', fontSize: 13, color: '#8B4513', background: '#FFF8EE', cursor: 'pointer' }}>
              <option value="">— use real GPS —</option>
              {stadiums.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.team?.name ? `${s.team.name} – ` : ''}{s.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setShowDevPanel(false)}
            style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#8B4513', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 }}>
            close
          </button>
        </div>
      )}
    </div>
  )
}
