import { 
    Phone, 
    PhoneCall,
    Users, 
    TrendUp, 
    Clock,
    Warning,
    Lightning,
    CalendarBlank,
    Pause
} from '@phosphor-icons/react';
import type { OutboundCampaign, DialerStatus } from '../../types';

interface CampaignStatsProps {
    campaign: OutboundCampaign;
    dialerStatus?: DialerStatus;
}

export function CampaignStats({ campaign, dialerStatus }: CampaignStatsProps) {
    // Calculate derived stats
    const answerRate = campaign.callsMade > 0 
        ? ((campaign.callsAnswered / campaign.callsMade) * 100).toFixed(1)
        : '0.0';
    
    const appointmentRate = campaign.callsAnswered > 0
        ? ((campaign.appointmentsBooked / campaign.callsAnswered) * 100).toFixed(1)
        : '0.0';

    const avgTalkTime = campaign.callsAnswered > 0
        ? Math.round(campaign.totalTalkTimeSeconds / campaign.callsAnswered)
        : 0;

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const completionPercent = campaign.totalLeads > 0
        ? Math.round((campaign.leadsCompleted / campaign.totalLeads) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Dialer Status Banner */}
            {dialerStatus && (
                <div className={`p-4 rounded-xl border ${
                    dialerStatus.isRunning 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {dialerStatus.isRunning ? (
                                <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="font-medium text-green-400">Dialer Active</span>
                                </>
                            ) : (
                                <>
                                    <Pause size={20} className="text-yellow-400" />
                                    <span className="font-medium text-yellow-400">Dialer Paused</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Lightning size={16} className="text-primary" />
                                <span className="text-textMuted">Active:</span>
                                <span className="font-medium text-textMain">{dialerStatus.activeCalls}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-textMuted" />
                                <span className="text-textMuted">Queue:</span>
                                <span className="font-medium text-textMain">{dialerStatus.queueLength}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Calls */}
                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <Phone size={16} />
                        <span className="text-xs uppercase tracking-wider">Total Calls</span>
                    </div>
                    <p className="text-2xl font-semibold text-textMain">{campaign.callsMade}</p>
                    <p className="text-xs text-textMuted mt-1">
                        {campaign.callsAnswered} answered
                    </p>
                </div>

                {/* Answer Rate */}
                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <PhoneCall size={16} />
                        <span className="text-xs uppercase tracking-wider">Answer Rate</span>
                    </div>
                    <p className="text-2xl font-semibold text-textMain">{answerRate}%</p>
                    <p className="text-xs text-textMuted mt-1">
                        {campaign.callsVoicemail} voicemails
                    </p>
                </div>

                {/* Appointments */}
                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <CalendarBlank size={16} />
                        <span className="text-xs uppercase tracking-wider">Appointments</span>
                    </div>
                    <p className="text-2xl font-semibold text-green-400">{campaign.appointmentsBooked}</p>
                    <p className="text-xs text-textMuted mt-1">
                        {appointmentRate}% conversion
                    </p>
                </div>

                {/* Avg Talk Time */}
                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-textMuted mb-2">
                        <Clock size={16} />
                        <span className="text-xs uppercase tracking-wider">Avg Talk Time</span>
                    </div>
                    <p className="text-2xl font-semibold text-textMain">{formatDuration(avgTalkTime)}</p>
                    <p className="text-xs text-textMuted mt-1">
                        {formatDuration(campaign.totalTalkTimeSeconds)} total
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-textMuted">Campaign Progress</span>
                    <span className="text-sm font-medium text-textMain">{completionPercent}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-textMuted">
                    <span>{campaign.leadsCompleted} completed</span>
                    <span>{campaign.leadsPending} pending</span>
                </div>
            </div>

            {/* Call Outcomes Distribution */}
            <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-medium text-textMuted mb-4">Call Outcomes</h4>
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                            <PhoneCall size={18} className="text-green-400" />
                        </div>
                        <p className="text-lg font-semibold text-textMain">{campaign.callsAnswered}</p>
                        <p className="text-xs text-textMuted">Answered</p>
                    </div>
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                            <Warning size={18} className="text-yellow-400" />
                        </div>
                        <p className="text-lg font-semibold text-textMain">{campaign.callsVoicemail}</p>
                        <p className="text-xs text-textMuted">Voicemail</p>
                    </div>
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-2">
                            <Phone size={18} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-textMain">{campaign.callsNoAnswer}</p>
                        <p className="text-xs text-textMuted">No Answer</p>
                    </div>
                    <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                            <TrendUp size={18} className="text-red-400" />
                        </div>
                        <p className="text-lg font-semibold text-textMain">{campaign.callsFailed}</p>
                        <p className="text-xs text-textMuted">Failed</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CampaignStats;
