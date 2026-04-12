import { useEffect } from 'react'

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px',
      width: 'calc(100% - 32px)', maxWidth: '360px', pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const bgColor = toast.type === 'battle' ? '#4E2A84'
    : toast.type === 'accepted' ? '#1A7F3C'
    : toast.type === 'rejected' ? '#B00020'
    : '#8B4513'

  const icon = toast.type === 'battle' ? '⚔️'
    : toast.type === 'accepted' ? '✓'
    : toast.type === 'rejected' ? '✗'
    : '🃏'

  return (
    <div style={{
      backgroundColor: bgColor,
      color: '#FFFFFF',
      borderRadius: '12px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      pointerEvents: 'auto',
      animation: 'toast-in 0.25s ease-out',
    }}
      onClick={() => onDismiss(toast.id)}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '14px',
        lineHeight: 1.3, flex: 1,
      }}>
        {toast.message}
      </span>
    </div>
  )
}
