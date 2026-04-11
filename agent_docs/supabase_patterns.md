# Supabase Query Patterns

Always import `supabase` from `src/lib/supabase.js`. Never instantiate inline.

## Fetching

```js
// Fetch all stadiums
const { data, error } = await supabase.from('stadiums').select('*')

// Fetch players for a team
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('team_id', teamId)

// Fetch user's collected cards with player info
const { data, error } = await supabase
  .from('user_cards')
  .select('id, collected_at, player:players(*)')
  .eq('user_id', userId)
```

## Inserting

```js
// Insert a new user
const { data, error } = await supabase
  .from('users')
  .insert({ username })
  .select()
  .single()

// Insert multiple user_cards
const { error } = await supabase
  .from('user_cards')
  .insert(playerIds.map(player_id => ({ user_id: userId, player_id })))
```

## Updating

```js
// Accept a friend request
const { error } = await supabase
  .from('friendships')
  .update({ status: 'accepted' })
  .eq('id', friendshipId)
```

## Atomic trade swap (use RPC)

```js
// Call a Supabase RPC for the atomic card swap on trade accept
const { error } = await supabase.rpc('accept_trade', { trade_id: tradeId })
```

Define the RPC in Supabase SQL editor:
```sql
CREATE OR REPLACE FUNCTION accept_trade(trade_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t trades%ROWTYPE;
BEGIN
  SELECT * INTO t FROM trades WHERE id = trade_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Trade not found or not pending'; END IF;

  -- Swap ownership
  UPDATE user_cards SET user_id = t.receiver_id WHERE id = t.offered_card_id;
  UPDATE user_cards SET user_id = t.proposer_id WHERE id = t.requested_card_id;
  UPDATE trades SET status = 'accepted' WHERE id = trade_id;
END;
$$;
```

## Error handling pattern

```js
const { data, error } = await supabase.from('users').select('*')
if (error) {
  console.error(error.message)
  // set error state, show user-facing message
  return
}
```
