import React, { useEffect, useState } from 'react';
import { CopySimple, Check, ArrowSquareOut, Info } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../lib/api';
import { API } from '../../lib/constants';

interface WhatsAppNumber {
  id: string;
  display_phone_number: string;
  display_name?: string;
  assistant_id?: string | null;
  status?: string;
  created_at?: string;
}

interface WhatsAppTabProps {
  assistantId: string | null | undefined;
}

const WhatsAppTab: React.FC<WhatsAppTabProps> = ({ assistantId }) => {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [enabling, setEnabling] = useState<string | null>(null);

  const webhookUrl = `${API.BACKEND_URL}/api/webhooks/whatsapp`;

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/whatsapp/numbers');
      const data = await res.json();
      setNumbers(data.numbers || []);
    } catch (err) {
      console.error('Error fetching WhatsApp numbers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAssistant = async (num: WhatsAppNumber) => {
    if (!assistantId) return;
    setEnabling(num.id);
    try {
      const isEnabled = num.assistant_id === assistantId;
      await authFetch(`/api/whatsapp/configs/${num.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: isEnabled ? null : assistantId }),
      });
      await fetchNumbers();
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setEnabling(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const colorMap: Record<string, string> = {
      active: 'bg-green-500/20 text-green-300 border-green-500/30',
      inactive: 'bg-zinc-700 text-zinc-400 border-zinc-600',
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    };
    const cls = colorMap[status.toLowerCase()] || 'bg-zinc-700 text-zinc-400 border-zinc-600';
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
    );
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex gap-2 text-blue-300 text-sm">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          When enabled, incoming WhatsApp messages to a number will be handled by this assistant.
        </span>
      </div>

      {/* Webhook URL */}
      <div>
        <div className="text-zinc-400 text-xs mb-2">Webhook URL</div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
          <span className="text-zinc-300 text-xs flex-1 truncate font-mono">{webhookUrl}</span>
          <button
            onClick={copyWebhook}
            className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <CopySimple size={14} />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm text-center py-10">Loading WhatsApp numbers...</div>
      ) : numbers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="text-zinc-400 text-sm text-center">No WhatsApp Business numbers connected yet</div>
          <button
            onClick={() => navigate('/integrations')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            Connect WhatsApp Business Account <ArrowSquareOut size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {numbers.map((num) => {
            const isEnabled = num.assistant_id === assistantId && !!assistantId;
            return (
              <div
                key={num.id}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-100 font-medium text-sm">{num.display_phone_number}</div>
                  {num.display_name && (
                    <div className="text-zinc-400 text-xs mt-0.5">{num.display_name}</div>
                  )}
                </div>
                {getStatusBadge(num.status)}
                <button
                  disabled={!assistantId || enabling === num.id}
                  onClick={() => toggleAssistant(num)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                    isEnabled
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                  }`}
                >
                  {enabling === num.id
                    ? 'Updating...'
                    : isEnabled
                    ? 'Enabled ✓'
                    : 'Enable for this assistant'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!assistantId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-sm">
          ⚠️ Save the assistant first to enable WhatsApp numbers
        </div>
      )}
    </div>
  );
};

export default WhatsAppTab;
