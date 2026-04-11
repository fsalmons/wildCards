import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Login } from './pages/Login'
import { MapPage } from './pages/MapPage'
import { CollectionPage } from './pages/CollectionPage'
import { FriendsPage } from './pages/FriendsPage'
import { TradePage } from './pages/TradePage'
import { BottomNav } from './components/Nav/BottomNav'
import './styles/retro.css'

function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>
      <BottomNav />
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
