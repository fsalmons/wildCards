import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Login } from './pages/Login'
import { MapPage } from './pages/MapPage'
import { CollectionPage } from './pages/CollectionPage'
import { FriendsPage } from './pages/FriendsPage'
import { TradePage } from './pages/TradePage'
import { ProfilePage } from './pages/ProfilePage'
import { BottomNav } from './components/Nav/BottomNav'
import { ToastStack } from './components/Notifications/ToastStack'
import { supabase } from './lib/supabase'
import './styles/retro.css'

function useNotifications(toasts, setToasts) {
  const seenRef = useRef({ trades: new Set(), comps: new Set() })
  const initializedRef = useRef(false)

  function addToast(message, type) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const poll = useCallback(async () => {
    const raw = localStorage.getItem('scc_user')
    if (!raw) return
    const user = JSON.parse(raw)
    if (!user?.id) return

    // ── Trades ──────────────────────────────────────────────────────────────────
    const { data: trades } = await supabase
      .from('trades')
      .select('id, status, proposer_id, receiver_id')
      .or(`receiver_id.eq.${user.id},proposer_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted', 'rejected'])

    const newTrades = (trades ?? []).filter(t => !seenRef.current.trades.has(t.id + t.status))
    if (newTrades.length > 0 && initializedRef.current) {
      const otherIds = [...new Set(newTrades.map(t => t.proposer_id === user.id ? t.receiver_id : t.proposer_id))]
      const { data: uRows } = await supabase.from('users').select('id, username').in('id', otherIds)
      const uMap = Object.fromEntries((uRows ?? []).map(u => [u.id, u.username]))
      for (const t of newTrades) {
        const otherId = t.proposer_id === user.id ? t.receiver_id : t.proposer_id
        const name = uMap[otherId] ?? 'Someone'
        if (t.receiver_id === user.id && t.status === 'pending')
          addToast(`${name} sent you a trade offer`, 'trade')
        else if (t.proposer_id === user.id && t.status === 'accepted')
          addToast(`${name} accepted your trade`, 'accepted')
        else if (t.proposer_id === user.id && t.status === 'rejected')
          addToast(`${name} rejected your trade`, 'rejected')
      }
    }
    newTrades.forEach(t => seenRef.current.trades.add(t.id + t.status))

    // ── Competitions ─────────────────────────────────────────────────────────────
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, status, challenger_id, opponent_id')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['pending', 'active', 'rejected'])

    const newComps = (comps ?? []).filter(c => !seenRef.current.comps.has(c.id + c.status))
    if (newComps.length > 0 && initializedRef.current) {
      const otherIds = [...new Set(newComps.map(c => c.challenger_id === user.id ? c.opponent_id : c.challenger_id))]
      const { data: uRows } = await supabase.from('users').select('id, username').in('id', otherIds)
      const uMap = Object.fromEntries((uRows ?? []).map(u => [u.id, u.username]))
      for (const c of newComps) {
        const otherId = c.challenger_id === user.id ? c.opponent_id : c.challenger_id
        const name = uMap[otherId] ?? 'Someone'
        if (c.opponent_id === user.id && c.status === 'pending')
          addToast(`${name} sent you a battle invitation`, 'battle')
        else if (c.challenger_id === user.id && c.status === 'active')
          addToast(`${name} accepted your battle invitation`, 'accepted')
        else if (c.challenger_id === user.id && c.status === 'rejected')
          addToast(`${name} rejected your battle invitation`, 'rejected')
      }
    }
    newComps.forEach(c => seenRef.current.comps.add(c.id + c.status))

    initializedRef.current = true
  }, [])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 15000)
    const onVisible = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [poll])
}

function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', minHeight: 0 }}>
        <Outlet />
      </div>
      <div style={{ flexShrink: 0, height: 'calc(60px + env(safe-area-inset-bottom))', zIndex: 10000, position: 'relative' }}>
        <BottomNav />
      </div>
    </div>
  )
}

function AppWithNotifications() {
  const [toasts, setToasts] = useState([])
  useNotifications(toasts, setToasts)

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/trade/:friendId" element={<TradePage />} />
        <Route element={<AppLayout />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppWithNotifications />
    </BrowserRouter>
  )
}

export default App
