# Voice Library Implementation Plan

## Overview
Build a **curated Voice Library** showcasing prebuilt voices powered by **ElevenLabs APIs**. Users browse voices with **sample audio in different languages** to hear quality before selecting. Platform uses its own ElevenLabs API key (users don't need their own).

---

## ✅ Confirmed Requirements

| Requirement | Decision |
|-------------|----------|
| **Starting Point** | Prebuilt voices only (cloning later) |
| **Sample Audio** | Show audio samples in different languages per voice |
| **API Key Model** | Platform-wide (your key, users don't need one) |
| **Voice Sharing** | Prebuilt library shared by all users |
| **Pricing** | Custom pricing (higher than ElevenLabs cost) - TBD |
| **TTS Preview** | In Agent section only, NOT in Voice Library |
| **Cloning** | Future feature (private to user when implemented) |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VOICE LIBRARY (Phase 1)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│   │  Callyy Voice   │    │  ElevenLabs (Backend)                │   │
│   │  Library        │───▶│  - Platform API Key                  │   │
│   │  (Supabase)     │    │  - TTS during calls                  │   │
│   └─────────────────┘    └──────────────────────────────────────┘   │
│          │                                                           │
│          ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Pre-recorded Sample Audio (per voice, per language)        │   │
│   │  - Stored in Supabase Storage / CDN                         │   │
│   │  - Users preview quality in their language                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Flow:                                                              │
│   1. Admin curates voices from ElevenLabs                           │
│   2. Admin records sample audio in multiple languages               │
│   3. Users browse library, listen to samples                        │
│   4. Users select voice for their assistant                         │
│   5. During calls, platform's ElevenLabs API key is used            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Voice Library Features

### What Users See
- **Curated voice collection** - Hand-picked quality voices
- **Sample audio per language** - Hear each voice in Hindi, English, Tamil, etc.
- **Voice characteristics** - Gender, accent, style tags
- **Custom pricing** - Platform's pricing (not ElevenLabs cost)

### Sample Audio Strategy
Each voice will have **pre-recorded samples** in multiple languages:
- Hindi
- English (Indian accent)
- Tamil
- Telugu
- Marathi
- Bengali
- etc.

This lets users evaluate voice quality in their target language before committing.

---

## 3. Database Schema

### 3.1 Updated `voices` Table (Platform-Curated Library)

```sql
-- Migration: 003_voice_library_elevenlabs.sql

-- Recreate voices table for platform-wide curated library
-- Note: This is NOT per-user, it's a shared library

DROP TABLE IF EXISTS public.voices CASCADE;

CREATE TABLE public.voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Neutral')),
    
    -- ElevenLabs Reference
    elevenlabs_voice_id TEXT NOT NULL UNIQUE,
    elevenlabs_model_id TEXT DEFAULT 'eleven_multilingual_v2',
    
    -- Categorization
    accent TEXT NOT NULL,              -- 'Indian', 'American', 'British', etc.
    primary_language TEXT NOT NULL,    -- Main language this voice is best for
    supported_languages TEXT[] DEFAULT '{}',  -- All languages it supports
    tags TEXT[] DEFAULT '{}',          -- 'Conversational', 'Formal', 'News', etc.
    
    -- Voice Settings (defaults for this voice)
    default_stability DECIMAL(3,2) DEFAULT 0.5,
    default_similarity DECIMAL(3,2) DEFAULT 0.75,
    default_style DECIMAL(3,2) DEFAULT 0.0,
    
    -- Pricing (custom platform pricing)
    cost_per_min DECIMAL(10, 2) NOT NULL,  -- In INR, what we charge users
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voices_gender ON public.voices(gender);
CREATE INDEX idx_voices_accent ON public.voices(accent);
CREATE INDEX idx_voices_primary_language ON public.voices(primary_language);
CREATE INDEX idx_voices_is_active ON public.voices(is_active);
CREATE INDEX idx_voices_is_featured ON public.voices(is_featured);
CREATE INDEX idx_voices_display_order ON public.voices(display_order);

-- NO RLS - This is a public library accessible to all authenticated users
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read voices
CREATE POLICY "Authenticated users can view voices"
    ON public.voices FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Only service role can insert/update/delete (admin operations)
CREATE POLICY "Service role can manage voices"
    ON public.voices FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### 3.2 New `voice_samples` Table (Audio Samples per Language)

```sql
-- Voice audio samples in different languages
CREATE TABLE public.voice_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voice_id UUID NOT NULL REFERENCES public.voices(id) ON DELETE CASCADE,
    
    -- Sample Info
    language TEXT NOT NULL,           -- 'Hindi', 'English', 'Tamil', etc.
    sample_text TEXT NOT NULL,        -- What text was spoken
    audio_url TEXT NOT NULL,          -- URL to audio file (Supabase Storage)
    duration_seconds INTEGER,         -- Length of sample
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_samples_voice_id ON public.voice_samples(voice_id);
CREATE INDEX idx_voice_samples_language ON public.voice_samples(language);

-- Unique constraint: one sample per voice per language
CREATE UNIQUE INDEX idx_voice_samples_unique ON public.voice_samples(voice_id, language);

-- RLS
ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view samples
CREATE POLICY "Authenticated users can view voice samples"
    ON public.voice_samples FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can manage samples
CREATE POLICY "Service role can manage voice samples"
    ON public.voice_samples FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### 3.3 Trigger for updated_at

```sql
-- Add trigger for voices updated_at
CREATE TRIGGER update_voices_updated_at 
    BEFORE UPDATE ON public.voices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. TypeScript Types

```typescript
// frontend/types.ts

export interface Voice {
    id: string;
    name: string;
    description?: string;
    gender: 'Male' | 'Female' | 'Neutral';
    
    // ElevenLabs reference (internal use)
    elevenlabsVoiceId: string;
    elevenlabsModelId: string;
    
    // Categorization
    accent: string;
    primaryLanguage: string;
    supportedLanguages: string[];
    tags: string[];
    
    // Settings defaults
    defaultStability: number;
    defaultSimilarity: number;
    defaultStyle: number;
    
    // Pricing
    costPerMin: number;  // INR
    
    // Status
    isActive: boolean;
    isFeatured: boolean;
    displayOrder: number;
    
    // Samples (loaded separately or joined)
    samples?: VoiceSample[];
}

export interface VoiceSample {
    id: string;
    voiceId: string;
    language: string;
    sampleText: string;
    audioUrl: string;
    durationSeconds?: number;
}

// For UI display
export interface VoiceWithSamples extends Voice {
    samples: VoiceSample[];
}
```

---

## 5. Frontend Service

```typescript
// frontend/services/callyyService.ts - Voice functions

/**
 * Get all active voices from library
 */
export const getVoices = async (): Promise<Voice[]> => {
    const { data, error } = await supabase
        .from('voices')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return mapVoicesFromDB(data);
};

/**
 * Get voice with all its language samples
 */
export const getVoiceWithSamples = async (voiceId: string): Promise<VoiceWithSamples> => {
    const { data, error } = await supabase
        .from('voices')
        .select(`
            *,
            voice_samples (*)
        `)
        .eq('id', voiceId)
        .single();

    if (error) throw error;
    return mapVoiceWithSamplesFromDB(data);
};

/**
 * Get all voices with their samples (for library page)
 */
export const getVoicesWithSamples = async (): Promise<VoiceWithSamples[]> => {
    const { data, error } = await supabase
        .from('voices')
        .select(`
            *,
            voice_samples (*)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data.map(mapVoiceWithSamplesFromDB);
};

/**
 * Get featured voices (for homepage/overview)
 */
export const getFeaturedVoices = async (): Promise<Voice[]> => {
    const { data, error } = await supabase
        .from('voices')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(6);

    if (error) throw error;
    return mapVoicesFromDB(data);
};
```

---

## 6. Frontend Components

### 6.1 Component Structure

```
frontend/
├── pages/
│   └── VoiceLibrary.tsx          # Main page (enhanced)
├── components/
│   ├── VoiceCard.tsx             # Voice display card (enhanced)
│   └── VoiceSamplePlayer.tsx     # NEW: Language sample selector & player
```

### 6.2 VoiceLibrary Page Features

- **Search**: Search by voice name
- **Filters**: 
  - Language (Hindi, English, Tamil, etc.)
  - Gender (Male, Female)
  - Tags (Conversational, Formal, News, etc.)
- **Featured Section**: Highlight top voices
- **Grid Display**: Voice cards with sample player

### 6.3 VoiceCard Enhanced Features

```typescript
interface VoiceCardFeatures {
    // Display
    voiceName: string;
    gender: string;
    accent: string;
    tags: string[];
    costPerMin: number;
    
    // Language Sample Player
    samplePlayer: {
        languages: string[];        // Available sample languages
        selectedLanguage: string;   // Currently selected
        audioUrl: string;           // Current audio URL
        isPlaying: boolean;
    };
    
    // Actions
    actions: {
        playPause: () => void;      // Toggle audio
        selectLanguage: (lang: string) => void;
        selectVoice: () => void;    // For use in assistant
        copyId: () => void;
    };
}
```

### 6.4 VoiceSamplePlayer Component

```typescript
// New component for playing samples in different languages
interface VoiceSamplePlayerProps {
    samples: VoiceSample[];
    onLanguageChange?: (language: string) => void;
}

// Features:
// - Dropdown/tabs to select language
// - Play/pause button
// - Progress indicator
// - Shows sample text being spoken
```

---

## 7. UI Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│  Voice Library                                                       │
│  Explore premium AI voices optimized for Indian languages            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔍 Search voices...                                                │
│                                                                      │
│  Filters:                                                           │
│  [All] [Hindi] [English] [Tamil] [Telugu] [Male] [Female]          │
│  [Conversational] [Formal] [News] [Support]                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  ⭐ Featured Voices                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐│
│  │ ▶️  Aditi          │  │ ▶️  Raj            │  │ ▶️  Priya      ││
│  │     Female • Indian│  │     Male • Indian  │  │     Female     ││
│  │                    │  │                    │  │                ││
│  │ 🌐 [Hindi ▼]       │  │ 🌐 [English ▼]     │  │ 🌐 [Tamil ▼]   ││
│  │ ━━━━━━━━━━━━ 0:05 │  │ ━━━━━━━━━━━━ 0:05 │  │ ━━━━━━━━━ 0:05││
│  │                    │  │                    │  │                ││
│  │ [Conv] [Warm]      │  │ [Formal] [Clear]   │  │ [Narrative]    ││
│  │                    │  │                    │  │                ││
│  │ ₹4.50/min          │  │ ₹3.50/min          │  │ ₹4.00/min      ││
│  │           [Select] │  │           [Select] │  │        [Select]││
│  └────────────────────┘  └────────────────────┘  └────────────────┘│
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  All Voices (12)                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐│
│  │ ▶️  Arjun          │  │ ▶️  Meera          │  │ ▶️  Vikram     ││
│  │     Male • Indian  │  │     Female • South │  │     Male       ││
│  │                    │  │                    │  │                ││
│  │ 🌐 [Hindi ▼]       │  │ 🌐 [Telugu ▼]      │  │ 🌐 [English ▼] ││
│  │ ━━━━━━━━━━━━ 0:05 │  │ ━━━━━━━━━━━━ 0:05 │  │ ━━━━━━━━━ 0:05││
│  │                    │  │                    │  │                ││
│  │ [News] [Formal]    │  │ [Warm] [Support]   │  │ [Professional] ││
│  │                    │  │                    │  │                ││
│  │ ₹3.00/min          │  │ ₹4.00/min          │  │ ₹3.50/min      ││
│  │           [Select] │  │           [Select] │  │        [Select]││
│  └────────────────────┘  └────────────────────┘  └────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key UI Elements:

1. **Language Selector per Card**: Dropdown to switch sample language
2. **Audio Progress Bar**: Shows playback progress
3. **Play/Pause Toggle**: Single button to control audio
4. **Tags**: Quick visual of voice characteristics
5. **Price**: Clear cost per minute display
6. **Select Button**: Add to assistant (navigates to assistant editor)

---

## 8. Sample Audio Strategy

### Pre-recorded Samples
You (admin) will create sample audio files for each voice in each language:

1. **Generate via ElevenLabs**: Use their TTS to create samples
2. **Store in Supabase Storage**: Upload audio files
3. **Insert URLs in Database**: Link samples to voices

### Sample Text Examples (Same text in each language):

**English:**
> "Hello! Welcome to Callyy. I'm here to help you with any questions you might have. How can I assist you today?"

**Hindi:**
> "नमस्ते! Callyy में आपका स्वागत है। मैं आपके किसी भी सवाल में मदद के लिए यहाँ हूँ। आज मैं आपकी कैसे सहायता कर सकता हूँ?"

**Tamil:**
> "வணக்கம்! Callyy-க்கு வரவேற்கிறோம். உங்களுக்கு ஏதேனும் கேள்விகள் இருந்தால் உதவ நான் இங்கே இருக்கிறேன். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?"

### Admin Workflow for Adding Voices:

```
1. Pick voice from ElevenLabs
2. Note the voice_id
3. Generate sample audio in each language using ElevenLabs TTS
4. Upload audio files to Supabase Storage
5. Insert voice record in voices table
6. Insert sample records in voice_samples table
```

---

## 9. Implementation Status ✅

### Phase 1: Database Schema ✅
- [x] Created migration `003_voice_library.sql`
- [x] Voices table with ElevenLabs reference
- [x] Voice samples table for multi-language audio
- [x] RLS policies for public read access
- [x] Seed data with sample voices

### Phase 2: Service Layer ✅
- [x] Updated `callyyService.ts` with new voice functions
- [x] `getVoices()` - Get all active voices
- [x] `getVoicesWithSamples()` - Get voices with samples joined
- [x] `getFeaturedVoices()` - Get featured voices
- [x] `getVoiceSamples()` - Get samples for a voice

### Phase 3: UI Components ✅
- [x] Created `VoiceSamplePlayer.tsx` - Language selector + MP3 player
- [x] Updated `VoiceCard.tsx` - Integrated sample player
- [x] Updated `VoiceLibrary.tsx` - Filters, search, featured section

### Phase 4: Documentation ✅
- [x] Created `VOICE_LIBRARY_SETUP.md` with detailed setup instructions

---

## 10. Files Modified/Created

```
Created:
├── backend/supabase/migrations/003_voice_library.sql
├── frontend/components/VoiceSamplePlayer.tsx
├── VOICE_LIBRARY_SETUP.md

Modified:
├── frontend/types.ts
├── frontend/services/callyyService.ts
├── frontend/components/VoiceCard.tsx
└── frontend/pages/VoiceLibrary.tsx
```

---

## Next Steps (Manual)

1. **Run migration** in Supabase SQL Editor
2. **Create storage bucket** `voice-samples`
3. **Update ElevenLabs voice IDs** in database
4. **Upload sample MP3s** to storage
5. **Update audio URLs** in voice_samples table

See `VOICE_LIBRARY_SETUP.md` for detailed instructions.
