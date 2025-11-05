# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose a name (e.g., "fpl-companion")
4. Set a strong database password (save this!)
5. Choose a region close to your users
6. Click "Create new project"

Wait 2-3 minutes for the project to be provisioned.

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in your project root
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the placeholder values with your actual keys from Step 2.

## Step 4: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

This will create all necessary tables, indexes, Row Level Security policies, and triggers.

## Step 5: Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider (should be enabled by default)
3. Configure email templates if desired

## Step 6: (Optional) Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Click on **Google**
3. Enable the provider
4. Follow Supabase's guide to set up Google OAuth:
   - Create OAuth credentials in Google Cloud Console
   - Add authorized redirect URIs
   - Copy Client ID and Secret to Supabase

## Step 7: Test the Integration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`
3. Try signing up with an email
4. Check your Supabase dashboard → **Authentication** → **Users** to see your new user

## Database Tables Created

### `profiles`
- User profile information
- Linked to Supabase auth.users
- Stores FPL team ID, username, preset preference

### `squads`
- Saved squad configurations
- JSONB field for full squad data
- Tracks bank, gameweek, active status

### `squad_history`
- Historical record of squads per gameweek
- Stores predicted and actual points
- Team and GW ratings

### `watchlist`
- Players user wants to track
- Player ID, name, and optional notes

## Security Features

✅ **Row Level Security (RLS)** enabled on all tables  
✅ Users can only access their own data  
✅ Automatic profile creation on signup  
✅ Updated timestamps automatically maintained  

## Next Steps

After setup is complete, you can:

1. **Test Authentication**: Visit `/login` and sign up
2. **Save Squads**: The app will automatically save to your database
3. **Track History**: Squad changes are logged per gameweek
4. **Add to Watchlist**: Mark favorite players to monitor

## Troubleshooting

### "Cannot find module '@supabase/auth-helpers-react'"
- Restart your IDE/TypeScript server
- Run `npm install` again
- Check that packages installed successfully

### Auth not working
- Verify environment variables are set correctly
- Check Supabase project is active (not paused)
- Ensure redirect URLs are configured in Supabase dashboard

### Database errors
- Verify schema was run successfully in SQL Editor
- Check table permissions and RLS policies
- Look at Supabase logs for detailed error messages

## Useful Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
