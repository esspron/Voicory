
import { 
    Phone, 
    Users, 
    CalendarBlank, 
    Play, 
    Pause, 
    CheckCircle,
    Clock,
    TrendUp,
    Lightning
} from '@phosphor-icons/react';
import type { OutboundCampaign } from '../../types';

interface CampaignCardProps {
    campaign: OutboundCampaign;
    onClick: () => void;
    onStart?: () => void;
    onPause?: () => void;
}

export function CampaignCard({ campaign, onClick, onStart, onPause }: CampaignCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'scheduled': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-white/10 text-textMuted border-white/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Lightning size={12} weight="fill" />;
            case 'paused': return <Pause size={12} weight="fill" />;
            case 'completed': return <CheckCircle size={12} weight="fill" />;
            case 'scheduled': return <Clock size={12} weight="fill" />;
            default: return null;
        }
    };

    const answerRate = campaign.callsMade > 0 
        ? ((campaign.callsAnswered / campaign.callsMade) * 100).toFixed(1)
        : '0';

    const progress = campaign.totalLeads > 0 
        ? ((campaign.leadsCompleted / campaign.totalLeads) * 100).toFixed(0)
        : '0';

    return (
        <div
            onClick={onClick}
            className="group relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 overflow-hidden"
        >
            {/* Ambient glow on hover */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/0 group-hover:bg-primary/10 blur-3xl transition-all duration-500" />
            
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-textMain truncate group-hover:text-primary transition-colors">
                        {campaign.name}
                    </h3>
                    {campaign.description && (
                        <p className="text-xs text-textMuted mt-0.5 truncate">
                            {campaign.description}
                        </p>
                    )}
                </div>
                
                {/* Status Badge */}
                <span className={`ml-3 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(campaign.status)}`}>
                    {getStatusIcon(campaign.status)}
                    {campaign.status}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-textMuted mb-1">
                        <Users size={14} />
                        <span className="text-xs">Leads</span>
                    </div>
                    <p className="text-lg font-semibold text-textMain">
                        {campaign.totalLeads.toLocaleString()}
                    </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-textMuted mb-1">
                        <Phone size={14} />
                        <span className="text-xs">Calls</span>
                    </div>
                    <p className="text-lg font-semibold text-textMain">
                        {campaign.callsMade.toLocaleString()}
                    </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-textMuted mb-1">
                        <TrendUp size={14} />
                        <span className="text-xs">Answer</span>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                        {answerRate}%
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-textMuted mb-1.5">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-textMuted">
                    <CalendarBlank size={14} />
                    <span>
                        {campaign.startDate 
                            ? new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'No date set'
                        }
                    </span>
                </div>
                
                {/* Quick Actions */}
                {campaign.status === 'active' && onPause && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPause();
                        }}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                        title="Pause campaign"
                    >
                        <Pause size={16} weight="fill" />
                    </button>
                )}
                {(campaign.status === 'draft' || campaign.status === 'paused') && onStart && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart();
                        }}
                        className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Start campaign"
                    >
                        <Play size={16} weight="fill" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default CampaignCard;
