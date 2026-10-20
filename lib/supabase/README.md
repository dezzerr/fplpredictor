# Supabase Client Usage

## Overview

We use `@supabase/auth-helpers-nextjs` for our Supabase integration, which provides utilities for Next.js App Router.

## Client Types

### Client Components (`client.ts`)
Use `createClientComponentClient()` for client-side operations:

```typescript
import { createClient } from '@/lib/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  
  // Use supabase for auth, queries, etc.
}
```

### Server Components (`server.ts`)
Use `createServerComponentClient()` for server-side operations:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function MyServerComponent() {
  const supabase = createClient()
  
  const { data } = await supabase.from('profiles').select()
  return <div>{/* render data */}</div>
}
```

### Route Handlers
Use `createRouteHandlerClient()` for API routes:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  // ...
}
```

## Authentication Patterns

### Check if User is Logged In

```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  // User is authenticated
}
```

### Listen to Auth State Changes

```typescript
useEffect(() => {
  const supabase = createClient()
  
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // Handle sign in
    }
    if (event === 'SIGNED_OUT') {
      // Handle sign out
    }
  })

  return () => subscription.unsubscribe()
}, [])
```

### Sign Out

```typescript
const supabase = createClient()
await supabase.auth.signOut()
router.push('/login')
```

## Database Operations

### Query Data

```typescript
const supabase = createClient()

// Select
const { data, error } = await supabase
  .from('squads')
  .select('*')
  .eq('user_id', user.id)

// Insert
const { error } = await supabase
  .from('squads')
  .insert({ user_id: user.id, name: 'My Squad', squad_data: {} })

// Update
const { error } = await supabase
  .from('squads')
  .update({ name: 'Updated Name' })
  .eq('id', squadId)

// Delete
const { error } = await supabase
  .from('squads')
  .delete()
  .eq('id', squadId)
```

## Row Level Security

All tables have RLS enabled. Users can only access their own data. The policies are defined in `supabase/schema.sql`.

## Real-time Subscriptions

```typescript
const supabase = createClient()

const channel = supabase
  .channel('squad_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'squads',
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Clean up
return () => {
  supabase.removeChannel(channel)
}
```

## Best Practices

1. **Always check for errors**: Supabase operations return `{ data, error }`
2. **Memoize client**: Use `useState(() => createClient())` in components
3. **Use TypeScript**: Import types from `database.types.ts`
4. **Handle auth state**: Listen to auth changes for real-time updates
5. **Secure sensitive operations**: Use service role key only on server-side

## Common Pitfalls

❌ **Don't create client on every render**
```typescript
// Bad
const supabase = createClient() // Creates new client every render
```

✅ **Do memoize the client**
```typescript
// Good
const [supabase] = useState(() => createClient())
```

❌ **Don't expose service role key to client**
```typescript
// Bad - NEVER do this
const supabase = createClient(url, SERVICE_ROLE_KEY) // Client-side
```

✅ **Do use appropriate client type**
```typescript
// Good
const supabase = createClient() // Uses anon key automatically
```
