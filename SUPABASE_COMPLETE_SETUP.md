# Complete Supabase Setup Guide

## ✅ Progress So Far
- [x] Supabase packages installed
- [x] Client and server utilities created
- [x] Database schema ready
- [x] Auth pages created
- [x] TypeScript issues fixed
- [x] Save squad functionality implemented

## 🚀 Remaining Steps

### Step 1: Create Your Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose organization (or create one)
4. Project details:
   - **Name**: `fpl-companion` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for provisioning

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Starts with `eyJ...`
   - **service_role key**: Starts with `eyJ...` (keep secret!)

### Step 3: Create Environment Variables

Create a `.env.local` file in your project root:

```bash
# In your terminal, run:
touch .env.local
```

Add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Your existing environment variables
ODDS_API_KEY=your_odds_api_key_here
API_FOOTBALL_KEY=your_api_football_key_here
BETFAIR_APP_KEY=your_betfair_app_key_here
ODDS_CACHE_TTL_SECONDS=600
```

### Step 4: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** to execute

This creates:
- `profiles` table (user info)
- `squads` table (saved squads)
- `squad_history` table (performance tracking)
- `watchlist` table (favorite players)
- Row Level Security policies
- Automatic triggers

### Step 5: Configure Authentication

#### Email Auth (Already Enabled)
- Email authentication is enabled by default
- Users can sign up with email/password

#### Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Click **Google**
3. Enable the provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

**Google Cloud Console Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

### Step 6: Update Site URL

In Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`

### Step 7: Test the Setup

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test Authentication**:
   - Visit `http://localhost:3000/login`
   - Try signing up with email
   - Check Supabase dashboard → **Authentication** → **Users**

3. **Test Squad Saving**:
   - Build a squad on the main page
   - Click **"Save"** button in header
   - Select gameweek and save
   - Check Supabase dashboard → **Table Editor** → **squads**

## 🔧 Troubleshooting

### "Module not found" errors
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or restart your dev server
npm run dev
```

### Authentication not working
- Verify environment variables are correct
- Check Supabase project is active (not paused)
- Ensure redirect URLs match exactly

### Database errors
- Verify schema ran successfully
- Check Supabase logs for detailed errors
- Ensure RLS policies are active

### Save squad not working
- Check browser console for errors
- Verify user is signed in
- Check Supabase table permissions

## 🎯 Expected Results

After setup, you should have:

✅ **Working Authentication**
- Sign up/in with email
- Google OAuth (if configured)
- Automatic profile creation

✅ **Squad Management**
- Save squads for different gameweeks
- Load previously saved squads
- Track squad history and performance

✅ **Database Integration**
- User data stored securely
- Row-level security active
- Real-time updates

## 📋 Quick Checklist

- [ ] Supabase project created
- [ ] API keys copied
- [ ] `.env.local` file created with correct values
- [ ] Database schema executed successfully
- [ ] Dev server restarted
- [ ] Authentication tested (sign up works)
- [ ] Squad save functionality tested
- [ ] Google OAuth configured (optional)

## 🚨 Security Notes

- **Never commit** `.env.local` to git (it's already gitignored)
- **Keep service role key secret** - only use server-side
- **Use anon key** for client-side operations
- **Row Level Security** protects user data automatically

## 🆘 Need Help?

If you encounter issues:

1. **Check Supabase logs**: Dashboard → Logs
2. **Browser console**: F12 → Console tab
3. **Network tab**: Check failed requests
4. **Supabase docs**: [supabase.com/docs](https://supabase.com/docs)

---

Once you complete these steps, your FPL Companion will have full user authentication and squad management capabilities! 🎉
