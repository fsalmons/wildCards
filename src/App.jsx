import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Login } from './pages/Login'
import { MapPage } from './pages/MapPage'
import { CollectionPage } from './pages/CollectionPage'
import { FriendsPage } from './pages/FriendsPage'
import { TradePage } from './pages/TradePage'
import { ProfilePage } from './pages/ProfilePage'
import { BottomNav } from './components/Nav/BottomNav'
import './styles/retro.css'

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

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
