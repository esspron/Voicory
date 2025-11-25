# Voice Library Setup Guide

## Overview

The Voice Library is a curated collection of AI voices powered by ElevenLabs. Users browse voices with sample audio in multiple languages and select them for their assistants.

**Key Features:**
- Platform-curated voices (not per-user)
- Sample MP3s in multiple languages (Hindi, English, Tamil, etc.)
- Each voice maps to an ElevenLabs voice_id
- Custom pricing (your margins over ElevenLabs cost)

---

## Setup Steps

### Step 1: Run Database Migration

Copy the contents of `backend/supabase/migrations/003_voice_library.sql` and run it in **Supabase Dashboard > SQL Editor**.

This will:
1. Create the `voices` table (platform library)
2. Create the `voice_samples` table (audio samples per language)
3. Set up RLS policies (all authenticated users can read)
4. Insert seed data with sample voices

### Step 2: Create Storage Bucket

In **Supabase Dashboard > Storage**:

1. Click **New Bucket**
2. Name: `voice-samples`
3. Public: **Yes** (toggle on)
4. Click **Create bucket**

Then add a policy for public access:

```sql
-- Run in SQL Editor
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-samples');
```

### Step 3: Update ElevenLabs Voice IDs

The seed data includes placeholder voice IDs. You need to update them with **real ElevenLabs voice IDs** from your account.

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Select voices you want to offer
3. Copy each voice's ID
4. Update the `voices` table:

```sql
UPDATE public.voices 
SET elevenlabs_voice_id = 'ACTUAL_ELEVENLABS_ID' 
WHERE name = 'Aditi';

-- Repeat for each voice
```

### Step 4: Upload Sample MP3 Files

For each voice, you need to create sample audio in different languages:

#### Option A: Use ElevenLabs to Generate Samples

1. Go to ElevenLabs
2. Select the voice
3. Enter sample text (see below)
4. Download MP3
5. Upload to Supabase Storage

#### Option B: Use the ElevenLabs API

```javascript
// Generate sample audio via API
const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
        method: 'POST',
        headers: {
            'xi-api-key': YOUR_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: "नमस्ते! Callyy में आपका स्वागत है।",
            model_id: 'eleven_multilingual_v2'
        })
    }
);
const audioBuffer = await response.arrayBuffer();
// Save as MP3
```

#### Sample Texts by Language:

**English:**
```
Hello! Welcome to Callyy. I'm here to help you with any questions you might have. How can I assist you today?
```

**Hindi:**
```
नमस्ते! Callyy में आपका स्वागत है। मैं आपके किसी भी सवाल में मदद के लिए यहाँ हूँ। आज मैं आपकी कैसे सहायता कर सकता हूँ?
```

**Tamil:**
```
வணக்கம்! Callyy-க்கு வரவேற்கிறோம். உங்களுக்கு ஏதேனும் கேள்விகள் இருந்தால் உதவ நான் இங்கே இருக்கிறேன்.
```

**Telugu:**
```
నమస్కారం! Callyy కి స్వాగతం. మీకు ఏవైనా ప్రశ్నలు ఉంటే సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను.
```

### Step 5: Upload MP3s to Supabase Storage

1. Go to **Supabase Dashboard > Storage > voice-samples**
2. Click **Upload files**
3. Upload MP3 files with naming convention: `{voice_id}_{language}.mp3`
   - Example: `a1b2c3d4_hindi.mp3`

### Step 6: Update Sample URLs in Database

After uploading, update the `voice_samples` table with correct URLs:

```sql
-- Get your Supabase URL from Settings > API
-- Format: https://YOUR_PROJECT.supabase.co

UPDATE public.voice_samples 
SET audio_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/voice-samples/FILENAME.mp3'
WHERE voice_id = 'VOICE_UUID' AND language = 'Hindi';
```

Or use the direct storage URL pattern:
```
https://{project-ref}.supabase.co/storage/v1/object/public/voice-samples/{filename}
```

---

## Database Schema

### voices Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Your branded voice name |
| description | TEXT | Voice description |
| gender | TEXT | Male/Female/Neutral |
| elevenlabs_voice_id | TEXT | **ElevenLabs voice ID** (used for calls) |
| elevenlabs_model_id | TEXT | ElevenLabs model (default: eleven_multilingual_v2) |
| accent | TEXT | e.g., "Indian", "South Indian" |
| primary_language | TEXT | Main language |
| supported_languages | TEXT[] | All languages this voice supports |
| tags | TEXT[] | e.g., ["Conversational", "Warm"] |
| cost_per_min | DECIMAL | Your pricing in INR |
| is_active | BOOLEAN | Show in library |
| is_featured | BOOLEAN | Show in featured section |
| display_order | INTEGER | Sort order |

### voice_samples Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| voice_id | UUID | Foreign key to voices |
| language | TEXT | e.g., "Hindi", "English" |
| sample_text | TEXT | What text was spoken |
| audio_url | TEXT | URL to MP3 file |
| duration_seconds | INTEGER | Sample length |

---

## Adding a New Voice (Checklist)

1. [ ] Get ElevenLabs voice_id
2. [ ] Insert voice record in `voices` table
3. [ ] Generate sample MP3s in each language
4. [ ] Upload MP3s to Supabase Storage
5. [ ] Insert records in `voice_samples` table with correct URLs
6. [ ] Test playback in Voice Library page

### SQL Template for Adding a Voice:

```sql
-- 1. Insert voice
INSERT INTO public.voices (
    name, description, gender, elevenlabs_voice_id, 
    accent, primary_language, supported_languages, 
    tags, cost_per_min, is_featured, display_order
)
VALUES (
    'Ananya',
    'Friendly and warm female voice, perfect for customer engagement.',
    'Female',
    'YOUR_ELEVENLABS_VOICE_ID',
    'Indian',
    'Hindi',
    ARRAY['Hindi', 'English', 'Bengali']::TEXT[],
    ARRAY['Friendly', 'Warm', 'Engagement']::TEXT[],
    4.00,
    false,
    10
)
RETURNING id;

-- 2. Insert samples (use the returned ID)
INSERT INTO public.voice_samples (voice_id, language, sample_text, audio_url, duration_seconds)
VALUES 
    ('RETURNED_UUID', 'Hindi', 'नमस्ते! आज मैं आपकी कैसे मदद कर सकती हूँ?', 'https://...', 5),
    ('RETURNED_UUID', 'English', 'Hello! How can I help you today?', 'https://...', 5);
```

---

## File Structure

```
frontend/
├── types.ts                       # Voice, VoiceSample types
├── services/
│   └── callyyService.ts           # getVoices, getVoicesWithSamples
├── components/
│   ├── VoiceCard.tsx              # Voice display card
│   └── VoiceSamplePlayer.tsx      # Language selector + MP3 player
└── pages/
    └── VoiceLibrary.tsx           # Main page with filters

backend/supabase/migrations/
└── 003_voice_library.sql          # Database migration
```

---

## Troubleshooting

### Audio not playing?
- Check if MP3 URL is accessible (try opening in browser)
- Verify CORS settings on Supabase Storage
- Check browser console for errors

### Voices not showing?
- Verify `is_active = true` for the voice
- Check RLS policies are correctly set
- Run `SELECT * FROM public.voices` to verify data

### Samples not loading?
- Check `voice_samples` table has records
- Verify `voice_id` matches the voice's UUID
- Check `audio_url` is correct

---

## Next Steps

1. **Admin Interface** - Add ability to manage voices without SQL
2. **Voice Cloning** - Allow users to clone their own voices (private)
3. **Real-time Preview** - TTS preview in Assistant editor

---

*Voice Library implementation complete!*
