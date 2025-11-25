# Phone Numbers Feature - Quick Reference

## 🚀 Quick Start

### 1. Apply Database Migration
```bash
# Copy the migration file content
cat backend/supabase/migrations/002_enhanced_phone_numbers.sql

# Go to Supabase Dashboard → SQL Editor → Paste and Run
```

### 2. Start Development Server
```bash
cd frontend
npm run dev
```

### 3. Navigate to Phone Numbers
Open browser → Login → Click "Phone Numbers" in sidebar

---

## 📋 Provider Types & Required Fields

| Provider | Required Fields | Optional Fields |
|----------|----------------|-----------------|
| **Free Callyy Number** | `areaCode` | `label` |
| **Free Callyy SIP** | `sipIdentifier` | `sipLabel`, `sipUsername`, `sipPassword`, `label` |
| **Import Twilio** | `twilioPhoneNumber`, `twilioAccountSid`, `twilioAuthToken` | `label`, `smsEnabled` |
| **Import Vonage** | `vonagePhoneNumber`, `vonageApiKey`, `vonageApiSecret` | `label` |
| **Import Telnyx** | `telnyxPhoneNumber`, `telnyxApiKey` | `label` |
| **BYO SIP Trunk** | `sipTrunkPhoneNumber`, `sipTrunkCredentialId` | `label`, `allowNonE164` |

---

## 🔧 API Functions

### Get All Phone Numbers
```typescript
import { getPhoneNumbers } from '@/services/callyyService';

const phoneNumbers = await getPhoneNumbers();
// Returns: PhoneNumber[]
```

### Create Phone Number (Callyy)
```typescript
import { createPhoneNumber } from '@/services/callyyService';

const result = await createPhoneNumber({
  number: '+1346XXXXXXX',
  provider: 'Callyy',
  areaCode: '346',
  label: 'Support Line',
  inboundEnabled: true,
  outboundEnabled: false,
  isActive: true
});
// Returns: PhoneNumber | null
```

### Create Phone Number (Twilio)
```typescript
const result = await createPhoneNumber({
  number: '+14155551234',
  provider: 'Twilio',
  twilioPhoneNumber: '+14155551234',
  twilioAccountSid: 'AC...',
  twilioAuthToken: 'token...',
  smsEnabled: true,
  label: 'Main Line',
  inboundEnabled: true,
  outboundEnabled: true,
  isActive: true
});
```

### Update Phone Number
```typescript
import { updatePhoneNumber } from '@/services/callyyService';

const success = await updatePhoneNumber('phone-id', {
  label: 'New Label',
  inboundEnabled: false
});
// Returns: boolean
```

### Delete Phone Number
```typescript
import { deletePhoneNumber } from '@/services/callyyService';

const success = await deletePhoneNumber('phone-id');
// Returns: boolean
```

### SIP Trunk Credentials
```typescript
import { 
  getSipTrunkCredentials, 
  createSipTrunkCredential,
  deleteSipTrunkCredential 
} from '@/services/callyyService';

// Get all credentials
const credentials = await getSipTrunkCredentials();

// Create credential
const newCred = await createSipTrunkCredential({
  name: 'Production SIP',
  sipTrunkUri: 'sip:trunk.example.com:5060',
  username: 'user',
  password: 'pass'
});

// Delete credential
const success = await deleteSipTrunkCredential('cred-id');
```

---

## 💾 Database Schema Quick Reference

### phone_numbers Table
```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY,
  number TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('Callyy', 'CallyySIP', 'Twilio', 'Vonage', 'Telnyx', 'BYOSIP')),
  user_id UUID REFERENCES auth.users(id),
  assistant_id UUID REFERENCES assistants(id),
  label TEXT,
  
  -- Common
  inbound_enabled BOOLEAN DEFAULT true,
  outbound_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Callyy
  area_code TEXT,
  
  -- CallyySIP
  sip_identifier TEXT,
  sip_label TEXT,
  sip_username TEXT,
  sip_password TEXT,
  
  -- Twilio
  twilio_phone_number TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  sms_enabled BOOLEAN,
  
  -- Vonage
  vonage_phone_number TEXT,
  vonage_api_key TEXT,
  vonage_api_secret TEXT,
  
  -- Telnyx
  telnyx_phone_number TEXT,
  telnyx_api_key TEXT,
  
  -- BYOSIP
  sip_trunk_phone_number TEXT,
  sip_trunk_credential_id UUID,
  allow_non_e164 BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sip_trunk_credentials Table
```sql
CREATE TABLE sip_trunk_credentials (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  sip_trunk_uri TEXT NOT NULL,
  username TEXT,
  password TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI Components

### PhoneNumberModal Usage
```tsx
import PhoneNumberModal from '@/components/PhoneNumberModal';

<PhoneNumberModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={(newNumber) => {
    // Handle success
    console.log('Created:', newNumber);
  }}
/>
```

---

## 🔒 Security Checklist

- [x] Row Level Security (RLS) enabled
- [x] User authentication required
- [x] User-scoped queries (auth.uid())
- [ ] ⚠️ API key encryption (TODO)
- [ ] ⚠️ Rate limiting (TODO)
- [ ] ⚠️ Input sanitization (TODO)

---

## 🧪 Testing Queries

### Get your user ID
```sql
SELECT id, email FROM auth.users;
```

### View all your phone numbers
```sql
SELECT * FROM phone_numbers 
WHERE user_id = auth.uid();
```

### Test RLS
```sql
-- Should return only YOUR numbers
SELECT count(*) FROM phone_numbers 
WHERE user_id = auth.uid();

-- Should return 0 (can't see others)
SELECT count(*) FROM phone_numbers 
WHERE user_id != auth.uid();
```

### Insert test data
```sql
-- See: backend/supabase/test_data.sql
```

---

## 🐛 Troubleshooting

### Phone numbers not showing
1. Check browser console for errors
2. Verify Supabase connection (`.env.local`)
3. Ensure user is authenticated
4. Check RLS policies are applied

### Cannot create phone number
1. Verify all required fields are filled
2. Check user authentication
3. Look for validation errors in console
4. Verify database migration was applied

### Delete not working
1. Confirm RLS policies allow DELETE
2. Ensure user owns the phone number
3. Check for foreign key constraints

---

## 📚 Documentation Files

- `PHONE_NUMBERS_SETUP.md` - Full setup guide
- `PHONE_NUMBERS_IMPLEMENTATION_SUMMARY.md` - What was built
- `PHONE_NUMBERS_DATA_FLOW.md` - Architecture diagrams
- `backend/supabase/migrations/002_enhanced_phone_numbers.sql` - Database migration
- `backend/supabase/test_data.sql` - Test data samples

---

## 🔗 Related Files

- **Types**: `frontend/types.ts`
- **Services**: `frontend/services/callyyService.ts`
- **Modal**: `frontend/components/PhoneNumberModal.tsx`
- **Page**: `frontend/pages/PhoneNumbers.tsx`
- **Migration**: `backend/supabase/migrations/002_enhanced_phone_numbers.sql`

---

## 💡 Pro Tips

1. **Always check RLS** - Query via auth.uid() ensures data isolation
2. **Use transactions** - For creating phone numbers with related data
3. **Encrypt secrets** - Never store API keys in plain text (production)
4. **Index wisely** - Already indexed on user_id, provider, area_code
5. **Validate inputs** - Phone number format, area codes, etc.
6. **Handle errors gracefully** - Show user-friendly messages

---

## 🚨 Production Checklist

Before deploying:
- [ ] Apply database migration
- [ ] Test all provider types
- [ ] Implement API key encryption
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Add input validation
- [ ] Test RLS thoroughly
- [ ] Document API keys management
- [ ] Set up backups
- [ ] Load test the feature

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-25  
**Status**: ✅ Ready for Testing
