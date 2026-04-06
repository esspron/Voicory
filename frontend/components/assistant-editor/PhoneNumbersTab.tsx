import React, { useEffect, useState } from 'react';
import { CopySimple, Check } from '@phosphor-icons/react';
import { authFetch } from '../../lib/api';

interface PhoneNumber {
  id: string;
  number: string;
  label?: string;
  assistant_id?: string | null;
  webhook_url?: string;
  provider?: string;
}

interface PhoneNumbersTabProps {
  assistantId: string | null | undefined;
}

const PhoneNumbersTab: React.FC<PhoneNumbersTabProps> = ({ assistantId }) => {
  const [twilioNumbers, setTwilioNumbers] = useState<PhoneNumber[]>([]);
  const [exotelNumbers, setExotelNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const [twilioRes, exotelRes] = await Promise.allSettled([
        authFetch('/api/twilio/phone-numbers').then((r) => r.json()),
        authFetch('/api/exotel/phone-numbers').then((r) => r.json()),
      ]);
      if (twilioRes.status === 'fulfilled') setTwilioNumbers(twilioRes.value.numbers || []);
      if (exotelRes.status === 'fulfilled') setExotelNumbers(exotelRes.value.numbers || []);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const assign = async (number: PhoneNumber, provider: 'twilio' | 'exotel', unassign = false) => {
    if (!assistantId && !unassign) return;
    setAssigning(number.id);
    try {
      const path = provider === 'twilio'
        ? `/api/twilio/phone-numbers/${number.id}/assign`
        : `/api/exotel/phone-numbers/${number.id}/assign`;
      await authFetch(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: unassign ? null : assistantId }),
      });
      await fetchNumbers();
    } catch (err) {
      console.error('Assign error:', err);
    } finally {
      setAssigning(null);
    }
  };

  const renderNumber = (num: PhoneNumber, provider: 'twilio' | 'exotel') => {
    const isAssigned = num.assistant_id === assistantId && !!assistantId;
    const badgeClass =
      provider === 'twilio'
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        : 'bg-orange-500/20 text-orange-300 border-orange-500/30';

    return (
      <div
        key={num.id}
        className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-100 font-medium text-sm flex-1">{num.number}</span>
          {num.label && <span className="text-zinc-400 text-xs">{num.label}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClass}`}>
            {provider === 'twilio' ? 'Twilio' : 'Exotel'}
          </span>
          {isAssigned && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-green-500/20 text-green-300 border-green-500/30">
              Assigned ✓
            </span>
          )}
        </div>

        {num.webhook_url && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
            <span className="text-zinc-400 text-xs flex-1 truncate font-mono">{num.webhook_url}</span>
            <button
              onClick={() => copyToClipboard(num.webhook_url!, `wh-${num.id}`)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
            >
              {copiedId === `wh-${num.id}` ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <CopySimple size={14} />
              )}
            </button>
          </div>
        )}

        <div className="flex justify-end">
          {isAssigned ? (
            <button
              disabled={assigning === num.id}
              onClick={() => assign(num, provider, true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors disabled:opacity-50"
            >
              {assigning === num.id ? 'Unassigning...' : 'Unassign'}
            </button>
          ) : (
            <button
              disabled={!assistantId || assigning === num.id}
              onClick={() => assign(num, provider)}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors disabled:opacity-40"
            >
              {assigning === num.id ? 'Assigning...' : 'Assign to this assistant'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {!assistantId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-300 text-sm">
          ⚠️ Save the assistant first to assign phone numbers
        </div>
      )}

      {loading ? (
        <div className="text-zinc-400 text-sm text-center py-10">Loading phone numbers...</div>
      ) : (
        <>
          {/* Twilio */}
          <div>
            <h3 className="text-zinc-300 font-semibold text-sm mb-3">Twilio Numbers</h3>
            {twilioNumbers.length === 0 ? (
              <div className="text-zinc-500 text-sm py-4 text-center bg-zinc-800/50 rounded-xl border border-zinc-700">
                No Twilio numbers found
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {twilioNumbers.map((n) => renderNumber(n, 'twilio'))}
              </div>
            )}
          </div>

          {/* Exotel */}
          <div>
            <h3 className="text-zinc-300 font-semibold text-sm mb-3">Exotel Numbers</h3>
            {exotelNumbers.length === 0 ? (
              <div className="text-zinc-500 text-sm py-4 text-center bg-zinc-800/50 rounded-xl border border-zinc-700">
                No Exotel numbers found
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {exotelNumbers.map((n) => renderNumber(n, 'exotel'))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneNumbersTab;
