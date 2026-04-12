import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OnboardingModal } from '../components/Onboarding/OnboardingModal'

const WELCOME_STEPS = [
  {
    icon: '🗺️',
    heading: 'Visit Stadiums',
    body: 'Head to real stadiums near you to unlock packs and collect player cards.',
  },
  {
    icon: '🎴',
    heading: 'Trade with Friends',
    body: 'Swap cards with friends to complete your collection. Every card has a unique rating!',
  },
  {
    icon: '🎁',
    heading: "You've Got 10 Cards!",
    body: "We've added 10 starter cards to your collection to kick things off.",
  },
]

const styles = `

  .login-root {
    min-height: 100dvh;
    background-color: #F5ECD7;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .login-title {
    font-family: 'Fredoka One', 'Arial Rounded MT Bold', sans-serif;
    font-size: 48px;
    font-weight: 400;
    color: #8B4513;
    letter-spacing: 2px;
    text-align: center;
    line-height: 1;
    margin: 0;
    text-shadow: 3px 3px 0px rgba(139, 69, 19, 0.25);
  }

  .login-subtitle {
    font-family: 'Fredoka One', 'Arial Rounded MT Bold', sans-serif;
    font-size: 16px;
    color: #A0522D;
    text-align: center;
    margin: 0;
    letter-spacing: 1px;
  }

  .login-divider {
    width: 100%;
    height: 2px;
    background: #8B4513;
    border-radius: 2px;
    opacity: 0.3;
    margin: 8px 0;
  }

  .login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .login-input {
    width: 100%;
    min-height: 44px;
    padding: 10px 16px;
    font-size: 16px;
    font-family: 'Fredoka One', 'Arial Rounded MT Bold', sans-serif;
    border: 2px solid #8B4513;
    border-radius: 12px;
    background: #FFFDF7;
    color: #3B1F0A;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }

  .login-input::placeholder {
    color: #C4A882;
  }

  .login-input:focus {
    border-color: #5C2A00;
    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.18);
  }

  .login-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-button {
    width: 100%;
    min-height: 44px;
    padding: 12px 16px;
    font-size: 20px;
    font-family: 'Fredoka One', 'Arial Rounded MT Bold', sans-serif;
    font-weight: 400;
    letter-spacing: 1px;
    background: #8B4513;
    color: #FFFFFF;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 0px #5C2A00;
    transition: background 0.15s, transform 0.1s, box-shadow 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .login-button:hover:not(:disabled) {
    background: #6B3410;
  }

  .login-button:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 1px 0px #5C2A00;
  }

  .login-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 0px #5C2A00;
  }

  .login-error {
    width: 100%;
    padding: 10px 14px;
    background: #FEE2E2;
    border: 1.5px solid #EF4444;
    border-radius: 10px;
    color: #991B1B;
    font-size: 14px;
    font-family: 'Fredoka One', 'Arial Rounded MT Bold', sans-serif;
    text-align: center;
    box-sizing: border-box;
  }
`

export function Login() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmed = username.trim()
    if (!trimmed) {
      setError('Please enter a username.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if user already exists
      const { data: existingUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', trimmed)
        .limit(1)

      if (fetchError) throw fetchError

      let user

      if (existingUsers && existingUsers.length > 0) {
        // User found — use existing record
        user = existingUsers[0]
      } else {
        // User not found — insert new row
        const { data: newUsers, error: insertError } = await supabase
          .from('users')
          .insert([{ username: trimmed }])
          .select('*')

        if (insertError) throw insertError
        user = newUsers[0]

        // Seed 10 random cards for the new user
        const { data: allPlayers } = await supabase.from('players').select('id')
        if (allPlayers && allPlayers.length > 0) {
          const shuffled = [...allPlayers].sort(() => Math.random() - 0.5)
          const picked = shuffled.slice(0, 10)
          const rating = () => Math.floor(Math.random() * 99) + 1
          await supabase.from('user_cards').insert(
            picked.map(p => ({
              user_id: user.id,
              player_id: p.id,
              rating: rating(),
              collected_at: new Date().toISOString(),
            }))
          )
        }
      }

      localStorage.setItem('scc_user', JSON.stringify(user))
      if (!localStorage.getItem('scc_welcomed')) {
        setShowWelcome(true)
      } else {
        navigate('/map')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showWelcome && (
        <OnboardingModal
          title="Welcome to WildCards!"
          steps={WELCOME_STEPS}
          onDone={() => {
            localStorage.setItem('scc_welcomed', '1')
            navigate('/map')
          }}
        />
      )}
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">
          <h1 className="login-title">WildCards</h1>
          <p className="login-subtitle">collect 'em at the stadium</p>
          <div className="login-divider" />
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <input
              className="login-input"
              type="text"
              placeholder="enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (error) setError(null)
              }}
              disabled={loading}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              aria-label="Username"
            />
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Loading...' : "Let's Go"}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
