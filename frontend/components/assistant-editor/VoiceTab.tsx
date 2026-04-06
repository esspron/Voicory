import React, { useEffect, useRef, useState } from 'react';
import { Info, Play, Square, Check } from '@phosphor-icons/react';
import { authFetch } from '../../lib/api';
import { API } from '../../lib/constants';

interface Voice {
  id?: string;
  voice_id?: string;
  name: string;
  provider: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

interface VoiceTabProps {
  selectedVoiceId: string | null;
  onVoiceSelect: (voice: Voice) => void;
  assistantId?: string | null;
}

type Provider = 'all' | 'elevenlabs' | 'openai' | 'google';

const PROVIDER_TABS: { id: Provider; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'elevenlabs', label: 'ElevenLabs' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
];

const PROVIDER_BADGE_COLORS: Record<string, string> = {
  elevenlabs: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  openai: 'bg-green-500/20 text-green-300 border-green-500/30',
  google: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const VoiceTab: React.FC<VoiceTabProps> = ({ selectedVoiceId, onVoiceSelect }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<Provider>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    authFetch('/api/voices')
      .then((res) => res.json())
      .then((data) => setVoices(data.voices || data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getVoiceKey = (v: Voice) => v.voice_id || v.id || v.name;

  const selectedVoice = voices.find(
    (v) => getVoiceKey(v) === selectedVoiceId
  );

  const filtered = voices.filter((v) => {
    const matchesProvider =
      filterProvider === 'all' || v.provider?.toLowerCase() === filterProvider;
    const matchesSearch = v.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  const playVoice = async (voice: Voice) => {
    const key = getVoiceKey(voice);

    if (playingId === key) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingId(key);

    let url = voice.preview_url;
    if (!url) {
      try {
        const res = await authFetch('/api/voices/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice_id: key }),
        });
        const data = await res.json();
        url = data.audio_url;
      } catch {
        setPlayingId(null);
        return;
      }
    }

    if (!url) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Currently Selected Card */}
      {selectedVoice && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <div className="flex-1">
            <div className="text-xs text-zinc-400 mb-0.5">Currently Selected</div>
            <div className="text-zinc-100 font-medium">{selectedVoice.name}</div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              PROVIDER_BADGE_COLORS[selectedVoice.provider?.toLowerCase()] ||
              'bg-zinc-700 text-zinc-300 border-zinc-600'
            }`}
          >
            {selectedVoice.provider}
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-fit">
        {PROVIDER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterProvider(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterProvider === tab.id
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search voices..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 text-sm outline-none focus:border-zinc-500"
      />

      {/* Voice list */}
      {loading ? (
        <div className="text-zinc-400 text-sm py-8 text-center">Loading voices...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500 text-sm py-8 text-center">No voices found</div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((voice) => {
            const key = getVoiceKey(voice);
            const isSelected = key === selectedVoiceId;
            const isPlaying = playingId === key;
            const isGoogle = voice.provider?.toLowerCase() === 'google';

            return (
              <div
                key={key}
                onClick={() => onVoiceSelect(voice)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors border ${
                  isSelected
                    ? 'bg-zinc-700 border-zinc-600'
                    : 'bg-zinc-800/50 border-transparent hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Play/Info button */}
                {isGoogle ? (
                  <span title="Preview not available for Google voices">
                    <Info size={18} className="text-zinc-500" />
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playVoice(voice);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors flex-shrink-0"
                  >
                    {isPlaying ? <Square size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                  </button>
                )}

                {/* Name */}
                <span className="flex-1 text-zinc-100 text-sm font-medium">{voice.name}</span>

                {/* Provider badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    PROVIDER_BADGE_COLORS[voice.provider?.toLowerCase()] ||
                    'bg-zinc-700 text-zinc-300 border-zinc-600'
                  }`}
                >
                  {voice.provider}
                </span>

                {/* Selected indicator */}
                {isSelected && <Check size={16} className="text-green-400" weight="bold" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VoiceTab;
