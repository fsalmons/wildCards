# Component Patterns

## Rules
- Named exports only — no `export default`
- Mobile-first: design at 390px, scale up
- All tap targets minimum 44x44px
- Use Tailwind for layout/spacing; retro.css tokens for colors/fonts
- Import `supabase` from `src/lib/supabase.js` — never instantiate inline

## File structure
```
src/components/ComponentName/
  ComponentName.jsx
```

## Basic component template
```jsx
export function ComponentName({ prop1, prop2 }) {
  return (
    <div className="...tailwind classes...">
      {/* content */}
    </div>
  )
}
```

## Async data pattern
```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function MyComponent({ userId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('table').select('*').eq('user_id', userId)
      if (error) { setError(error.message); setLoading(false); return }
      setData(data)
      setLoading(false)
    }
    fetchData()
  }, [userId])

  if (loading) return <div className="animate-pulse">Loading...</div>
  if (error) return <div className="text-red-500">{error}</div>
  return <div>{/* render data */}</div>
}
```

## Retro styling conventions
- Card background: `bg-[#F5ECD7]`
- Team color border: `border-2` with inline style `{{ borderColor: teamColor }}`
- Headings: `font-['Fredoka_One']` or via retro.css `var(--font-retro)`
- Buttons: chunky, no border-radius less than 8px, high contrast
