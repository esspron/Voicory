import { useState } from 'react';
import { 
    X, 
    Phone, 
    User, 
    EnvelopeSimple, 
    MapPin,
    TrendUp
} from '@phosphor-icons/react';
import type { CampaignLead, CampaignCallLog } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface LeadDetailPanelProps {
    lead: CampaignLead;
    callHistory?: CampaignCallLog[];
    onClose: () => void;
    onUpdate: (updates: Partial<CampaignLead>) => void;
    onAddToDNC: () => void;
}

export function LeadDetailPanel({
    lead,
    callHistory = [],
    onClose,
    onUpdate,
    onAddToDNC
}: LeadDetailPanelProps) {
    const [notes, setNotes] = useState(lead.notes || '');
    const [disposition, setDisposition] = useState(lead.disposition || '');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'calling': return 'primary';
            case 'pending': return 'default';
            case 'callback': return 'warning';
            case 'dnc': return 'error';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getDispositionColor = (disp: string) => {
        switch (disp) {
            case 'hot': return 'error';
            case 'warm': return 'warning';
            case 'cold': return 'default';
            case 'appointment_set': return 'success';
            case 'not_interested': return 'default';
            case 'callback': return 'primary';
            default: return 'default';
        }
    };

    const handleSaveNotes = () => {
        onUpdate({ notes });
    };

    const handleDispositionChange = (newDisp: string) => {
        setDisposition(newDisp);
        onUpdate({ disposition: newDisp as CampaignLead['disposition'] });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div>
                    <h3 className="text-lg font-semibold text-textMain">
                        {lead.firstName || lead.lastName 
                            ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
                            : 'Unknown Contact'
                        }
                    </h3>
                    <p className="text-sm text-textMuted">{lead.phoneNumber}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status & Score */}
                <div className="flex items-center gap-3">
                    <Badge variant={getStatusColor(lead.status) as 'default'}>
                        {lead.status}
                    </Badge>
                    {lead.disposition && (
                        <Badge variant={getDispositionColor(lead.disposition) as 'default'}>
                            {lead.disposition.replace('_', ' ')}
                        </Badge>
                    )}
                    {lead.leadScore !== undefined && lead.leadScore !== null && (
                        <Badge variant="info">
                            Score: {lead.leadScore}
                        </Badge>
                    )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Contact Info</h4>
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-textMuted" />
                            <span className="text-textMain">{lead.phoneNumber}</span>
                        </div>
                        {lead.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <EnvelopeSimple size={16} className="text-textMuted" />
                                <span className="text-textMain">{lead.email}</span>
                            </div>
                        )}
                        {lead.company && (
                            <div className="flex items-center gap-3 text-sm">
                                <User size={16} className="text-textMuted" />
                                <span className="text-textMain">{lead.company}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Property Info (for Real Estate) */}
                {(lead.propertyAddress || lead.propertyCity) && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Property</h4>
                        <div className="flex items-start gap-3 text-sm">
                            <MapPin size={16} className="text-textMuted mt-0.5" />
                            <div>
                                {lead.propertyAddress && (
                                    <p className="text-textMain">{lead.propertyAddress}</p>
                                )}
                                {lead.propertyCity && (
                                    <p className="text-textMuted">
                                        {[lead.propertyCity, lead.propertyState, lead.propertyZip]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        {lead.listingPrice && (
                            <div className="flex items-center gap-3 text-sm">
                                <TrendUp size={16} className="text-textMuted" />
                                <span className="text-textMain">
                                    ${lead.listingPrice.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Disposition */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Disposition</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {['hot', 'warm', 'cold', 'appointment_set', 'not_interested', 'callback'].map(disp => (
                            <button
                                key={disp}
                                onClick={() => handleDispositionChange(disp)}
                                className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                                    disposition === disp 
                                        ? 'bg-primary/20 border-primary text-primary' 
                                        : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10'
                                }`}
                            >
                                {disp.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Notes</h4>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={handleSaveNotes}
                        placeholder="Add notes about this lead..."
                        className="w-full h-24 px-3 py-2 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                </div>

                {/* Call History */}
                {callHistory.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">
                            Call History ({callHistory.length})
                        </h4>
                        <div className="space-y-2">
                            {callHistory.map((call) => (
                                <div
                                    key={call.id}
                                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            call.outcome === 'answered' ? 'bg-green-500' :
                                            call.outcome === 'voicemail' ? 'bg-yellow-500' :
                                            call.outcome === 'no_answer' ? 'bg-gray-500' :
                                            'bg-red-500'
                                        }`} />
                                        <div>
                                            <p className="text-sm text-textMain capitalize">
                                                {call.outcome || call.status}
                                            </p>
                                            <p className="text-xs text-textMuted">
                                                {new Date(call.initiatedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {call.durationSeconds > 0 && (
                                        <span className="text-xs text-textMuted">
                                            {Math.floor(call.durationSeconds / 60)}:{(call.durationSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <Button variant="destructive" size="sm" onClick={onAddToDNC} className="w-full">
                    Add to Do Not Call
                </Button>
            </div>
        </div>
    );
}

export default LeadDetailPanel;
