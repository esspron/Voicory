# Supabase Backend Setup Guide

This guide will help you set up the Supabase backend for your Voicory AI Dashboard.

## Prerequisites

- Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Supabase project URL and anon key (already provided)

## Step 1: Environment Variables

The environment variables have already been added to `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZX3IWuzboUWkTW-hJKM77g_mLrGEeay
```

## Step 2: Create Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_SUPABASE_PROJECT_REF
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

This will create:
- All necessary tables (voices, assistants, phone_numbers, api_keys, call_logs, customers)
- Row Level Security (RLS) policies for data isolation
- Indexes for performance
- Automatic timestamp triggers

## Step 3: Verify Tables

After running the migration:

1. Go to **Table Editor** in the Supabase Dashboard
2. You should see all 6 tables listed:
   - `voices`
   - `assistants`
   - `phone_numbers`
   - `api_keys`
   - `call_logs`
   - `customers`

## Step 4: Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. Configure email templates if desired (optional)

## Step 5: Test the Application

### Install Dependencies (if not already done)
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Test Authentication Flow

1. **Sign Up**
   - Navigate to http://localhost:5173/#/signup
   - Create a new account with email and password
   - You should be redirected to the dashboard

2. **Verify User in Supabase**
   - Go to **Authentication** → **Users** in Supabase Dashboard
   - Your new user should appear in the list

3. **Sign Out and Sign In**
   - Sign out from the dashboard
   - Navigate to http://localhost:5173/#/login
   - Sign in with your credentials
   - You should be redirected to the dashboard

4. **Test Data Operations**
   - The app will initially show mock data (fallback)
   - Once you add data through the UI, it will be stored in Supabase
   - Refresh the page to verify data persistence

## Features Implemented

### ✅ Authentication
- Email/password sign up and sign in
- Session persistence
- Automatic redirect for authenticated users
- Sign out functionality
- Password reset capability

### ✅ Database Integration
- All entities connected to Supabase:
  - Voices
  - Assistants
  - Phone Numbers
  - API Keys
  - Call Logs
  - Customers
- Automatic fallback to mock data if Supabase is unavailable
- CRUD operations for voices and customers

### ✅ Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Secure authentication with Supabase Auth

## Optional: Seed Sample Data

To add sample data for testing, you can uncomment the seed data section at the bottom of `supabase/migrations/001_initial_schema.sql` and replace `'YOUR_USER_ID'` with your actual user ID from the Supabase Auth dashboard.

## Troubleshooting

### "Missing Supabase environment variables" Error
- Ensure `.env.local` exists in the project root
- Verify the environment variables are correctly set
- Restart the development server

### Authentication Not Working
- Check Supabase Dashboard → Authentication → Providers
- Ensure Email provider is enabled
- Check browser console for specific error messages

### Data Not Persisting
- Verify tables were created successfully in Supabase
- Check RLS policies are enabled
- Ensure you're signed in (check browser console for auth errors)

### Connection Issues
- Verify your Supabase URL and anon key are correct
- Check your internet connection
- Verify Supabase project is active

## Next Steps

1. **Customize Email Templates**: Configure email templates in Supabase for password reset and email confirmation
2. **Add Social Providers**: Enable Google, GitHub, or Discord authentication in Supabase
3. **Implement Additional CRUD Operations**: Add create/update/delete functionality for all entities
4. **Add Real-time Features**: Use Supabase real-time subscriptions for live updates
5. **Deploy**: Deploy your application to production (Vercel, Netlify, etc.)

## Support

For issues with:
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **This Application**: Review the implementation plan and code comments
