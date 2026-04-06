import React, { useEffect, useRef, useState } from 'react';
import { Info, Play, Square, Check, MagnifyingGlass, CaretDown } from '@phosphor-icons/react';
import { authFetch } from '../../lib/api';

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

const PROVIDER_OPTIONS: { id: Provider; label: string }[] = [
  { id: 'all', label: 'All Providers' },
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
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    authFetch('/api/voices')
      .then((res) => res.json())
      .then((data) => setVoices(data.voices || data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProviderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getVoiceKey = (v: Voice) => v.voice_id || v.id || v.name;

  const selectedVoice = voices.find((v) => getVoiceKey(v) === selectedVoiceId);

  const filtered = voices.filter((v) => {
    const matchesProvider = filterProvider === 'all' || v.provider?.toLowerCase() === filterProvider;
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
    if (audioRef.current) audioRef.current.pause();
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
    if (!url) { setPlayingId(null); return; }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
  };

  const selectedProviderLabel = PROVIDER_OPTIONS.find(p => p.id === filterProvider)?.label || 'All Providers';

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* Currently Selected Card */}
      {selectedVoice && (
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-textMuted mb-0.5">Currently Selected</div>
            <div className="text-textMain font-medium truncate">{selectedVoice.name}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
            PROVIDER_BADGE_COLORS[selectedVoice.provider?.toLowerCase()] || 'bg-surfaceHover text-textMuted border-border'
          }`}>
            {selectedVoice.provider}
          </span>
        </div>
      )}

      {/* Search + Filter row */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
          <input
            type="text"
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-textMain placeholder:text-textMuted text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Provider custom dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProviderDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-textMain hover:border-primary/40 transition-all min-w-[140px] justify-between"
          >
            <span>{selectedProviderLabel}</span>
            <CaretDown
              size={13}
              weight="bold"
              className={`text-textMuted transition-transform flex-shrink-0 ${providerDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {providerDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setFilterProvider(opt.id); setProviderDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    filterProvider === opt.id
                      ? 'bg-primary/10 text-textMain font-medium'
                      : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'
                  }`}
                >
                  <span>{opt.label}</span>
                  {filterProvider === opt.id && <Check size={13} weight="bold" className="text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Voice list */}
      {loading ? (
        <div className="text-textMuted text-sm py-10 text-center">Loading voices...</div>
      ) : filtered.length === 0 ? (
        <div className="text-textMuted text-sm py-10 text-center">No voices found</div>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-surface/50 border-transparent hover:bg-surface hover:border-border'
                }`}
              >
                {/* Play/Info button */}
                {isGoogle ? (
                  <span title="Preview not available for Google voices" className="flex-shrink-0">
                    <Info size={18} className="text-textMuted" />
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); playVoice(voice); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-surfaceHover hover:bg-primary/20 text-textMuted hover:text-primary transition-colors flex-shrink-0"
                  >
                    {isPlaying ? <Square size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                  </button>
                )}

                {/* Name */}
                <span className="flex-1 text-textMain text-sm font-medium">{voice.name}</span>

                {/* Provider badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  PROVIDER_BADGE_COLORS[voice.provider?.toLowerCase()] || 'bg-surfaceHover text-textMuted border-border'
                }`}>
                  {voice.provider}
                </span>

                {/* Selected indicator */}
                {isSelected && <Check size={15} className="text-primary flex-shrink-0" weight="bold" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VoiceTab;
