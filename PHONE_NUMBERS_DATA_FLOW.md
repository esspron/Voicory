# Phone Numbers Data Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PhoneNumbers Page                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │  │
│  │  │  Number 1  │  │  Number 2  │  │ Add New +  │             │  │
│  │  │  Provider  │  │  Provider  │  │            │             │  │
│  │  │  Configure │  │  Configure │  │            │             │  │
│  │  │  Delete    │  │  Delete    │  │            │             │  │
│  │  └────────────┘  └────────────┘  └────────────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           │ onClick                                 │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           PhoneNumberModal Component                         │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌────────────────────────────────────┐  │  │
│  │  │   Sidebar    │  │       Form Content                 │  │  │
│  │  │              │  │                                    │  │  │
│  │  │ • Free Callyy│  │  Provider-Specific Fields:        │  │  │
│  │  │ • Callyy SIP │  │  • Area Code (Callyy)              │  │  │
│  │  │ • Twilio     │  │  • SIP Identifier (Callyy SIP)    │  │  │
│  │  │ • Vonage     │  │  • Account SID (Twilio)           │  │  │
│  │  │ • Telnyx     │  │  • API Keys (Vonage/Telnyx)       │  │  │
│  │  │ • BYO SIP    │  │  • SIP Credentials (BYO SIP)      │  │  │
│  │  │              │  │                                    │  │  │
│  │  └──────────────┘  │  ┌──────────┐  ┌──────────┐       │  │  │
│  │                    │  │  Cancel  │  │  Submit  │       │  │  │
│  │                    │  └──────────┘  └──────────┘       │  │  │
│  │                    └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Form Submit
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                                 │
│                    (callyyService.ts)                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  createPhoneNumber(phoneNumberData)                          │  │
│  │  ├─ Get authenticated user                                   │  │
│  │  ├─ Prepare insert data with provider-specific fields        │  │
│  │  ├─ Call Supabase client                                     │  │
│  │  └─ Return transformed result                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  getPhoneNumbers()                                           │  │
│  │  ├─ Fetch from Supabase (RLS auto-filters by user)          │  │
│  │  ├─ Transform snake_case to camelCase                        │  │
│  │  └─ Return PhoneNumber[]                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  deletePhoneNumber(id)                                       │  │
│  │  ├─ Delete from Supabase (RLS ensures ownership)            │  │
│  │  └─ Return success boolean                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Supabase Client SDK
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE LAYER                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Authentication Check                                        │  │
│  │  ├─ Verify JWT token                                         │  │
│  │  └─ Extract user_id (auth.uid())                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS) Policies                          │  │
│  │  ├─ SELECT: WHERE user_id = auth.uid()                      │  │
│  │  ├─ INSERT: CHECK user_id = auth.uid()                      │  │
│  │  ├─ UPDATE: WHERE user_id = auth.uid()                      │  │
│  │  └─ DELETE: WHERE user_id = auth.uid()                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Database Query Execution                                    │  │
│  │  └─ PostgreSQL executes with RLS constraints                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  phone_numbers TABLE                                         │  │
│  │  ├─ id (UUID, PK)                                            │  │
│  │  ├─ number (TEXT)                                            │  │
│  │  ├─ provider (ENUM: 6 types)                                 │  │
│  │  ├─ user_id (UUID, FK → auth.users)                          │  │
│  │  ├─ assistant_id (UUID, FK → assistants)                     │  │
│  │  ├─ label (TEXT)                                             │  │
│  │  │                                                            │  │
│  │  ├─ Common Fields:                                           │  │
│  │  │  ├─ inbound_enabled (BOOLEAN)                             │  │
│  │  │  ├─ outbound_enabled (BOOLEAN)                            │  │
│  │  │  └─ is_active (BOOLEAN)                                   │  │
│  │  │                                                            │  │
│  │  ├─ Provider-Specific Fields:                                │  │
│  │  │  ├─ area_code (Callyy)                                      │  │
│  │  │  ├─ sip_identifier (CallyySIP)                              │  │
│  │  │  ├─ twilio_account_sid (Twilio)                           │  │
│  │  │  ├─ vonage_api_key (Vonage)                               │  │
│  │  │  ├─ telnyx_api_key (Telnyx)                               │  │
│  │  │  └─ sip_trunk_credential_id (BYOSIP)                      │  │
│  │  │                                                            │  │
│  │  └─ Timestamps: created_at, updated_at                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  sip_trunk_credentials TABLE                                 │  │
│  │  ├─ id (UUID, PK)                                            │  │
│  │  ├─ name (TEXT)                                              │  │
│  │  ├─ sip_trunk_uri (TEXT)                                     │  │
│  │  ├─ username (TEXT)                                          │  │
│  │  ├─ password (TEXT)                                          │  │
│  │  ├─ user_id (UUID, FK → auth.users)                          │  │
│  │  └─ Timestamps: created_at, updated_at                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: Creating a Free Callyy Number

```
User Action: Clicks "Add Phone Number" → Selects "Free Callyy Number"
          → Enters area code "346" → Clicks "Create"

Flow:
1. PhoneNumberModal.handleSubmit()
   ├─ Validates: areaCode is not empty
   └─ Prepares data: { provider: 'Callyy', areaCode: '346', ... }

2. callyyService.createPhoneNumber()
   ├─ Gets authenticated user from Supabase
   ├─ Builds insert object with snake_case fields
   └─ Calls: supabase.from('phone_numbers').insert({ ... })

3. Supabase Layer
   ├─ Checks JWT authentication
   ├─ Applies RLS policy: user_id = auth.uid()
   └─ Executes INSERT query

4. Database
   ├─ Inserts row with UUID, timestamps
   └─ Returns inserted record

5. callyyService transforms and returns PhoneNumber object

6. PhoneNumberModal.onSuccess()
   └─ Updates parent component state

7. PhoneNumbers Page
   └─ Displays new phone number in grid
```

### Example 2: Importing from Twilio

```
User Action: Selects "Import Twilio" → Fills form → Toggles SMS ON
          → Clicks "Import from Twilio"

Flow:
1. PhoneNumberModal validates:
   ├─ twilioPhoneNumber: "+14156021922"
   ├─ twilioAccountSid: "AC123..."
   ├─ twilioAuthToken: "token123..."
   └─ smsEnabled: true

2. createPhoneNumber() called with:
   {
     number: "+14156021922",
     provider: "Twilio",
     twilioPhoneNumber: "+14156021922",
     twilioAccountSid: "AC123...",
     twilioAuthToken: "token123...",
     smsEnabled: true,
     label: "Twilio Number",
     inboundEnabled: true,
     outboundEnabled: true
   }

3. Supabase inserts with fields:
   - number
   - provider = 'Twilio'
   - twilio_phone_number
   - twilio_account_sid
   - twilio_auth_token (⚠️ should be encrypted)
   - sms_enabled = true
   - user_id = <current_user_uuid>

4. Record created and returned
5. UI updated with new Twilio number showing SMS badge
```

### Example 3: Deleting a Phone Number

```
User Action: Clicks "Delete" on a phone number → Confirms dialog

Flow:
1. PhoneNumbers.handleDelete(id)
   ├─ Shows confirmation dialog
   └─ Calls callyyService.deletePhoneNumber(id)

2. callyyService.deletePhoneNumber()
   └─ Calls: supabase.from('phone_numbers').delete().eq('id', id)

3. Supabase Layer
   ├─ Checks authentication
   ├─ Applies RLS: WHERE id = ? AND user_id = auth.uid()
   └─ Executes DELETE

4. Database
   └─ Removes record (only if user owns it)

5. PhoneNumbers Page
   └─ Removes from local state → UI updates
```

## Security Flow

```
Every Request:
    │
    ├─> 1. Frontend sends JWT token in header
    │
    ├─> 2. Supabase validates token
    │        ├─ Valid? → Extract user_id
    │        └─ Invalid? → Return 401 Unauthorized
    │
    ├─> 3. Apply RLS policies
    │        ├─ SELECT: Filter rows WHERE user_id = auth.uid()
    │        ├─ INSERT: Ensure new row user_id = auth.uid()
    │        ├─ UPDATE: Only rows WHERE user_id = auth.uid()
    │        └─ DELETE: Only rows WHERE user_id = auth.uid()
    │
    └─> 4. Execute query with constraints
             └─ Return results (only user's own data)
```

## Provider-Specific Field Mapping

```
Provider: Callyy
  Frontend Form          →  Database Column      →  UI Display
  ─────────────────────────────────────────────────────────
  areaCode: "346"       →  area_code: "346"     →  "+1346XXXXXXX"
  label: "Support"      →  label: "Support"     →  "Support"

Provider: CallyySIP
  Frontend Form                    →  Database Column             →  UI Display
  ──────────────────────────────────────────────────────────────────────────────
  sipIdentifier: "my-id"          →  sip_identifier: "my-id"    →  "sip:my-id@sip.callyy.ai"
  sipLabel: "Customer Support"    →  sip_label: "..."           →  "Customer Support"
  sipUsername: "user"             →  sip_username: "user"       →  (hidden in UI)
  sipPassword: "pass"             →  sip_password: "pass"       →  (hidden in UI)

Provider: Twilio
  Frontend Form                      →  Database Column                →  UI Display
  ────────────────────────────────────────────────────────────────────────────────────
  twilioPhoneNumber: "+1415..."     →  twilio_phone_number: "..."    →  "+1415..."
  twilioAccountSid: "AC..."         →  twilio_account_sid: "AC..."   →  (hidden)
  twilioAuthToken: "token"          →  twilio_auth_token: "token"    →  (hidden)
  smsEnabled: true                  →  sms_enabled: true             →  "SMS" badge
  label: "Main Line"                →  label: "Main Line"            →  "Main Line"
```

## State Management

```
PhoneNumbers Page State:
┌────────────────────────────────────────┐
│ phoneNumbers: PhoneNumber[]            │
│ loading: boolean                       │
│ isModalOpen: boolean                   │
│ deletingId: string | null              │
└────────────────────────────────────────┘
          │
          ├─> Fetch: getPhoneNumbers() → Update phoneNumbers[]
          │
          ├─> Create: Modal Success → Add to phoneNumbers[]
          │
          └─> Delete: deletePhoneNumber() → Remove from phoneNumbers[]

PhoneNumberModal State:
┌────────────────────────────────────────┐
│ selectedProvider: ProviderType         │
│ loading: boolean                       │
│ error: string | null                   │
│ ...provider-specific form fields       │
└────────────────────────────────────────┘
          │
          └─> Submit → createPhoneNumber() → onSuccess(newNumber)
                                           → Parent updates state
```

---

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Type safety throughout
- ✅ Security through RLS
- ✅ Real-time database sync
- ✅ User data isolation
- ✅ Proper error handling
- ✅ Optimistic UI updates
