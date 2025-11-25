# Phone Numbers Feature - Production Setup Guide

## Overview
This guide explains how to set up the enhanced phone numbers feature with support for multiple providers including:
- **Free Callyy Number** - Get free US phone numbers with area code selection
- **Free Callyy SIP** - Set up SIP URIs for free
- **Import Twilio** - Import existing Twilio phone numbers
- **Import Vonage** - Import existing Vonage phone numbers
- **Import Telnyx** - Import existing Telnyx phone numbers
- **BYO SIP Trunk** - Bring your own SIP trunk configuration

## Database Migration

### Step 1: Apply the Migration

1. Navigate to your Supabase Dashboard
2. Go to the SQL Editor
3. Open the migration file: `backend/supabase/migrations/002_enhanced_phone_numbers.sql`
4. Copy the entire content
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

This migration will:
- Add support for all provider types (Callyy, CallyySIP, Twilio, Vonage, Telnyx, BYOSIP)
- Add provider-specific configuration fields
- Create a new `sip_trunk_credentials` table for secure SIP trunk management
- Add indexes for better query performance
- Enable Row Level Security (RLS) for all new tables

### Step 2: Verify the Migration

Run this query to verify the migration was successful:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'phone_numbers'
ORDER BY ordinal_position;
```

You should see new columns like:
- `area_code`
- `sip_identifier`
- `twilio_phone_number`
- `vonage_api_key`
- `telnyx_api_key`
- `sip_trunk_phone_number`
- `inbound_enabled`
- `outbound_enabled`
- `is_active`
- And more...

## Frontend Setup

The frontend is already configured with:

1. **Updated Types** (`frontend/types.ts`)
   - Enhanced `PhoneNumber` interface with all provider fields
   - New `SipTrunkCredential` interface

2. **Service Functions** (`frontend/services/callyyService.ts`)
   - `getPhoneNumbers()` - Fetch all phone numbers
   - `createPhoneNumber()` - Create new phone number
   - `updatePhoneNumber()` - Update existing phone number
   - `deletePhoneNumber()` - Delete phone number
   - `getSipTrunkCredentials()` - Fetch SIP credentials
   - `createSipTrunkCredential()` - Create SIP credential
   - `deleteSipTrunkCredential()` - Delete SIP credential

3. **UI Components**
   - `PhoneNumberModal` - Multi-provider phone number creation modal
   - Updated `PhoneNumbers` page with full CRUD functionality

## Usage Guide

### Adding a Free Callyy Number

1. Click "Add Phone Number" button
2. Select "Free Callyy Number" from the sidebar
3. Enter a US area code (e.g., 346, 984, 326)
4. Optionally add a label
5. Click "Create"

### Setting Up Free Callyy SIP

1. Click "Add Phone Number" button
2. Select "Free Callyy SIP" from the sidebar
3. Enter a unique SIP identifier (e.g., "my-example-identifier")
4. This will create a SIP URI: `sip:my-example-identifier@sip.callyy.ai`
5. Optionally add SIP authentication (username/password)
6. Click "Import SIP URI"

### Importing from Twilio

1. Click "Add Phone Number" button
2. Select "Import Twilio" from the sidebar
3. Enter:
   - Twilio phone number (e.g., +14156021922)
   - Twilio Account SID
   - Twilio Auth Token
   - Label (optional)
4. Toggle SMS enabled if needed
5. Click "Import from Twilio"

### Importing from Vonage

1. Click "Add Phone Number" button
2. Select "Import Vonage" from the sidebar
3. Enter:
   - Vonage phone number
   - API Key
   - API Secret
   - Label (optional)
4. Click "Import from Vonage"

### Importing from Telnyx

1. Click "Add Phone Number" button
2. Select "Import Telnyx" from the sidebar
3. Enter:
   - Telnyx phone number
   - API Key
   - Label (optional)
4. Click "Import from Telnyx"

### Setting Up BYO SIP Trunk

1. First, create a SIP trunk credential (if not already created)
2. Click "Add Phone Number" button
3. Select "BYO SIP Trunk Number" from the sidebar
4. Enter:
   - Phone number
   - Select SIP trunk credential from dropdown
   - Toggle "Allow non-E164 phone numbers" if needed
   - Label (optional)
5. Click "Import SIP Phone Number"

## Security Considerations

### API Key Storage

⚠️ **Important**: The current implementation stores API keys and credentials in plain text in the database. For production use, you should:

1. **Encrypt sensitive fields** before storing them:
   - `twilio_auth_token`
   - `vonage_api_secret`
   - `telnyx_api_key`
   - `sip_password`
   - SIP trunk credentials

2. **Use Supabase Vault** for storing secrets:
   ```sql
   -- Example: Store Twilio auth token in vault
   SELECT vault.create_secret('twilio_auth_token_user_123', 'your-token-here');
   ```

3. **Implement server-side encryption/decryption** in your backend service

### Row Level Security (RLS)

RLS is enabled on all tables to ensure users can only access their own data:
- `phone_numbers` table has policies for SELECT, INSERT, UPDATE, DELETE
- `sip_trunk_credentials` table has policies for SELECT, INSERT, UPDATE, DELETE

All policies verify that `auth.uid() = user_id`.

## Testing

### Test the Phone Numbers Feature

1. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to the Phone Numbers page
3. Try adding phone numbers with different providers
4. Verify they appear in the list
5. Test delete functionality
6. Check the Supabase database to confirm data is being stored correctly

### Query Phone Numbers in Database

```sql
-- View all phone numbers for authenticated user
SELECT * FROM phone_numbers 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- View SIP trunk credentials
SELECT * FROM sip_trunk_credentials
WHERE user_id = auth.uid();
```

## Troubleshooting

### Issue: Migration fails with constraint error
**Solution**: Make sure you're running the migration on a fresh database or that existing data doesn't conflict with the new constraints.

### Issue: Cannot see phone numbers in UI
**Solution**: 
1. Check browser console for errors
2. Verify Supabase connection in `.env.local`
3. Ensure RLS policies are applied correctly
4. Check that user is authenticated

### Issue: Create button does nothing
**Solution**:
1. Check browser console for validation errors
2. Ensure all required fields are filled
3. Verify Supabase connection and user authentication

## API Reference

### PhoneNumber Type

```typescript
interface PhoneNumber {
    id: string;
    number: string;
    provider: 'Callyy' | 'CallyySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';
    assistantId?: string;
    label?: string;
    
    // Common fields
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isActive?: boolean;
    
    // Provider-specific fields
    areaCode?: string;
    sipIdentifier?: string;
    twilioPhoneNumber?: string;
    vonagePhoneNumber?: string;
    telnyxPhoneNumber?: string;
    sipTrunkPhoneNumber?: string;
    // ... and more
}
```

### Service Functions

```typescript
// Create phone number
const result = await createPhoneNumber({
    number: '+14155551234',
    provider: 'Twilio',
    twilioPhoneNumber: '+14155551234',
    twilioAccountSid: 'AC...',
    twilioAuthToken: 'your-token',
    label: 'Support Line',
    inboundEnabled: true,
    outboundEnabled: true
});

// Get all phone numbers
const phoneNumbers = await getPhoneNumbers();

// Update phone number
const success = await updatePhoneNumber('phone-id', {
    label: 'New Label',
    inboundEnabled: false
});

// Delete phone number
const success = await deletePhoneNumber('phone-id');
```

## Future Enhancements

Consider implementing:

1. **Phone Number Validation** - Validate phone numbers using libphonenumber or similar
2. **Provider API Integration** - Actually provision numbers through provider APIs
3. **Real-time Testing** - Add ability to test phone numbers with test calls
4. **Usage Analytics** - Track call volume and costs per phone number
5. **Automatic Provisioning** - Auto-provision numbers when creating assistants
6. **Number Pooling** - Manage pools of numbers for different use cases
7. **Webhook Configuration** - Configure webhooks for each provider
8. **Number Porting** - Support porting numbers between providers

## Support

For issues or questions:
1. Check the console logs in browser developer tools
2. Review Supabase logs in the dashboard
3. Verify environment variables are set correctly
4. Ensure migrations have been applied successfully

---

**Last Updated**: 2025-01-25
**Version**: 1.0.0
