import React, { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  contacts_count?: number;
  assistant_id?: string;
}

interface CampaignsTabProps {
  assistantId: string | null | undefined;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  draft: 'bg-zinc-700 text-zinc-400 border-zinc-600',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const CampaignsTab: React.FC<CampaignsTabProps> = ({ assistantId }) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assistantId) {
      setLoading(false);
      return;
    }
    authFetch('/api/outbound-dialer/campaigns')
      .then((r) => r.json())
      .then((data) => {
        const all: Campaign[] = data.campaigns || [];
        setCampaigns(all.filter((c) => c.assistant_id === assistantId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assistantId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-200 font-semibold text-sm">Outbound Campaigns</h3>
        <button
          disabled={!assistantId}
          onClick={() => navigate(`/campaigns/new?assistantId=${assistantId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium transition-colors disabled:opacity-40"
        >
          <Plus size={14} weight="bold" />
          Create Campaign
        </button>
      </div>

      {!assistantId ? (
        <div className="text-zinc-500 text-sm text-center py-10">
          Save the assistant first to view campaigns.
        </div>
      ) : loading ? (
        <div className="text-zinc-400 text-sm text-center py-10">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-zinc-400 text-sm">
            No campaigns yet. Create an outbound campaign to start making calls with this assistant.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((c) => {
            const badgeClass =
              STATUS_BADGE[c.status?.toLowerCase()] || 'bg-zinc-700 text-zinc-400 border-zinc-600';
            return (
              <div
                key={c.id}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-100 font-medium text-sm">{c.name}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">
                    {formatDate(c.created_at)}
                    {c.contacts_count != null && ` · ${c.contacts_count} contacts`}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClass}`}>
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsTab;
