# Testing the Callyy Dashboard Database

## Quick Start Testing

### 1. Login to Your App
Navigate to: http://localhost:5173 (or your dev URL)
- Sign up or login with your account
- Supabase Auth will set your `auth.uid()`

### 2. Check if RLS is Working

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Get your user ID (when logged in)
SELECT auth.uid();

-- Should return your UUID, e.g., '12345678-1234-1234-1234-123456789abc'
```

### 3. Insert Sample Data

#### Add a Voice
```sql
INSERT INTO voices (name, provider, language, accent, gender, cost_per_min, preview_url, tags, user_id)
VALUES (
  'Aditi - Hindi Voice',
  'callyy',
  'Hindi',
  'Indian',
  'Female',
  4.5,
  'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
  ARRAY['Conversational', 'Support'],
  auth.uid()
);
```

#### Add an Assistant
```sql
-- First, get a voice_id you just created
SELECT id, name FROM voices WHERE user_id = auth.uid();

-- Insert assistant (replace VOICE_ID_HERE with actual voice UUID)
INSERT INTO assistants (name, model, voice_id, transcriber, status, user_id)
VALUES (
  'Customer Support - Hindi',
  'gpt-4o',
  'VOICE_ID_HERE',
  'Deepgram Nova-2',
  'active',
  auth.uid()
);
```

#### Add a Phone Number
```sql
-- Get an assistant_id
SELECT id, name FROM assistants WHERE user_id = auth.uid();

-- Insert phone number (replace ASSISTANT_ID_HERE)
INSERT INTO phone_numbers (number, provider, assistant_id, label, user_id)
VALUES (
  '+91 98765 43210',
  'Callyy',
  'ASSISTANT_ID_HERE',
  'Support Line - India',
  auth.uid()
);
```

#### Add a Customer
```sql
INSERT INTO customers (name, email, phone_number, variables, user_id)
VALUES (
  'Rahul Sharma',
  'rahul.sharma@example.com',
  '+91 98765 12345',
  '{"plan": "Premium", "location": "Mumbai", "language": "Hindi"}'::jsonb,
  auth.uid()
);
```

#### Add a Call Log
```sql
INSERT INTO callyy_call_logs (assistant_name, phone_number, duration, cost, status, user_id)
VALUES (
  'Customer Support - Hindi',
  '+91 99887 76655',
  '4m 32s',
  12.50,
  'completed',
  auth.uid()
);
```

### 4. Query Your Data

```sql
-- View all your voices
SELECT * FROM voices WHERE user_id = auth.uid();

-- View all your assistants
SELECT * FROM assistants WHERE user_id = auth.uid();

-- View all your phone numbers
SELECT * FROM phone_numbers WHERE user_id = auth.uid();

-- View all your customers
SELECT * FROM customers WHERE user_id = auth.uid();

-- View all your call logs
SELECT * FROM callyy_call_logs WHERE user_id = auth.uid() ORDER BY created_at DESC;
```

### 5. Test RLS Isolation

Create a second user account and login. Run the same queries - you should see:
- ✅ Zero rows from User A's data
- ✅ Only your own data (User B)

This proves RLS is working correctly!

## Testing from the Frontend

### 1. Start the Frontend
```bash
cd frontend
npm run dev
```

### 2. Navigate Through the Dashboard
- **Dashboard** → Should show call logs, stats (or mock data if empty)
- **Assistants** → Should list your assistants (or show empty state)
- **Phone Numbers** → Should list your phone numbers
- **Customers** → Should list your customers
- **API Keys** → Should list your API keys
- **Voice Library** → Should list available voices

### 3. Create Data via UI
Try creating:
1. A new voice (Voice Library page)
2. A new assistant (Assistants page)
3. A new customer (Customers page)
4. A new phone number (Phone Numbers page)

All should be automatically associated with your logged-in user!

## Debugging Tips

### Check if User is Authenticated
```sql
SELECT auth.uid(); -- Should return a UUID, not NULL
```

### Check RLS Policies
```sql
-- View RLS policies for voices table
SELECT * FROM pg_policies WHERE tablename = 'voices';

-- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
```

### Check Table Row Counts
```sql
SELECT 
  'voices' as table_name, COUNT(*) as rows FROM voices WHERE user_id = auth.uid()
UNION ALL
SELECT 'assistants', COUNT(*) FROM assistants WHERE user_id = auth.uid()
UNION ALL
SELECT 'phone_numbers', COUNT(*) FROM phone_numbers WHERE user_id = auth.uid()
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE user_id = auth.uid()
UNION ALL
SELECT 'callyy_call_logs', COUNT(*) FROM callyy_call_logs WHERE user_id = auth.uid();
```

### View All Foreign Key Relationships
```sql
SELECT
  a.name as assistant_name,
  v.name as voice_name,
  p.number as phone_number
FROM assistants a
LEFT JOIN voices v ON a.voice_id = v.id
LEFT JOIN phone_numbers p ON p.assistant_id = a.id
WHERE a.user_id = auth.uid();
```

## Common Issues & Solutions

### Issue: "relation does not exist"
**Solution**: Make sure you're in the Supabase SQL Editor, not your local psql. The tables are in Supabase.

### Issue: "no rows returned"
**Solution**: Either:
1. You haven't inserted data yet (frontend will show mock data)
2. You're not logged in (auth.uid() returns NULL)
3. You're logged in as a different user than who created the data

### Issue: "permission denied for table"
**Solution**: RLS is working! You can only access your own data. Login with the correct user account.

### Issue: Frontend shows only mock data
**Solution**: This is expected if you haven't created any real data yet. The service layer falls back to mock data when Supabase returns empty results.

## Production Readiness Checklist

- ✅ All tables have RLS enabled
- ✅ User isolation working (auth.uid() in policies)
- ✅ Indexes on user_id for performance
- ✅ Timestamps auto-update on changes
- ✅ Foreign keys maintain referential integrity
- ✅ Service layer handles empty results gracefully
- ✅ Mock data fallback for demo purposes

## Next Steps

1. **Populate with Real Data**: Use the frontend UI to add your voices, assistants, customers
2. **Test Multi-User**: Create multiple accounts and verify data isolation
3. **Monitor Performance**: Check query performance in Supabase Dashboard
4. **Add Business Logic**: Implement additional features like analytics, reporting, etc.
