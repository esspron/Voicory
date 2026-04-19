import {
    Brain, ChatCircle, Lightbulb, Heart, Gear, Lightning, Warning
} from '@phosphor-icons/react';
import React from 'react';

import { MemoryConfig } from '../../types';
import Select from '../ui/Select';

interface AssistantFormData {
    memoryEnabled: boolean;
    memoryConfig: MemoryConfig;
}

interface MemoryTabProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const MemoryTab: React.FC<MemoryTabProps> = ({ formData, setFormData }) => {
    const updateMemoryConfig = (key: keyof MemoryConfig, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            memoryConfig: {
                ...prev.memoryConfig,
                [key]: value
            }
        }));
    };

    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl mx-auto">
                {/* Header with Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-textMain">Customer Memory</h2>
                        <p className="text-sm text-textMuted mt-1">
                            AI memory that remembers every customer interaction
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-textMuted">{formData.memoryEnabled ? 'Enabled' : 'Disabled'}</span>
                        <button
                            onClick={() => setFormData((prev: any) => ({ ...prev, memoryEnabled: !prev.memoryEnabled }))}
                            className={`w-12 h-7 rounded-full transition-colors relative ${formData.memoryEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${formData.memoryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {formData.memoryEnabled ? (
                    <>
                        {/* Features Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                                    <ChatCircle size={20} weight="duotone" className="text-blue-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Conversation History</h3>
                                <p className="text-xs text-textMuted">Full transcripts and AI summaries of every past call</p>
                            </div>
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                                    <Lightbulb size={20} weight="duotone" className="text-purple-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Smart Insights</h3>
                                <p className="text-xs text-textMuted">Auto-extracted preferences, objections & opportunities</p>
                            </div>
                            <div className="bg-surface border border-white/10 rounded-xl p-5">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <Heart size={20} weight="duotone" className="text-emerald-400" />
                                </div>
                                <h3 className="font-medium text-textMain mb-1">Sentiment Tracking</h3>
                                <p className="text-xs text-textMuted">Monitor customer satisfaction over time</p>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="bg-surface border border-white/10 rounded-xl p-6 mb-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Gear size={18} weight="duotone" />
                                Memory Configuration
                            </h3>

                            <div className="space-y-4">
                                {/* Remember Conversations */}
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Remember Conversations</div>
                                        <div className="text-xs text-textMuted">Store and recall past conversation transcripts</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('rememberConversations', !formData.memoryConfig.rememberConversations)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.rememberConversations ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.rememberConversations ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Extract Insights */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Extract Insights</div>
                                        <div className="text-xs text-textMuted">AI automatically identifies preferences, objections & opportunities</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('extractInsights', !formData.memoryConfig.extractInsights)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.extractInsights ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.extractInsights ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Track Sentiment */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Track Sentiment</div>
                                        <div className="text-xs text-textMuted">Monitor customer mood and satisfaction trends</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('trackSentiment', !formData.memoryConfig.trackSentiment)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.trackSentiment ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.trackSentiment ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Auto-generate Summary */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Auto-generate Summary</div>
                                        <div className="text-xs text-textMuted">Create AI summaries after each call ends</div>
                                    </div>
                                    <button
                                        onClick={() => updateMemoryConfig('autoGenerateSummary', !formData.memoryConfig.autoGenerateSummary)}
                                        className={`w-10 h-6 rounded-full transition-colors ${formData.memoryConfig.autoGenerateSummary ? 'bg-primary' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${formData.memoryConfig.autoGenerateSummary ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Max Context Conversations */}
                                <div className="flex items-center justify-between py-2 border-t border-border">
                                    <div>
                                        <div className="text-sm font-medium text-textMain">Context Window</div>
                                        <div className="text-xs text-textMuted">Number of past conversations to include in context</div>
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            value={{
                                                value: formData.memoryConfig.maxContextConversations.toString(),
                                                label: `${formData.memoryConfig.maxContextConversations} conversations`
                                            }}
                                            onChange={(option) => updateMemoryConfig('maxContextConversations', parseInt(option.value))}
                                            options={[
                                                { value: '3', label: '3 conversations' },
                                                { value: '5', label: '5 conversations' },
                                                { value: '10', label: '10 conversations' },
                                                { value: '15', label: '15 conversations' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* What Gets Injected */}
                        <div className="bg-surface border border-white/10 rounded-xl p-6">
                            <h3 className="font-semibold text-textMain mb-4 flex items-center gap-2">
                                <Lightning size={18} weight="fill" className="text-primary" />
                                Context Injected Into Calls
                            </h3>
                            <p className="text-xs text-textMuted mb-4">
                                When memory is enabled, the following information is automatically added to the system prompt for each call:
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeSummary}
                                        onChange={(e) => updateMemoryConfig('includeSummary', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Customer Summary</div>
                                        <div className="text-xs text-textMuted">Executive summary of who this customer is</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeInsights}
                                        onChange={(e) => updateMemoryConfig('includeInsights', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Key Insights</div>
                                        <div className="text-xs text-textMuted">Important preferences, objections, and opportunities</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.memoryConfig.includeActionItems}
                                        onChange={(e) => updateMemoryConfig('includeActionItems', e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm text-textMain">Pending Action Items</div>
                                        <div className="text-xs text-textMuted">Follow-ups and commitments from past calls</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Example Preview */}
                        <div className="mt-6 p-4 bg-background rounded-xl border border-dashed border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Warning size={14} weight="duotone" className="text-textMuted" />
                                <span className="text-xs font-medium text-textMuted uppercase tracking-wide">Example Memory Context</span>
                            </div>
                            <pre className="text-xs text-textMuted font-mono whitespace-pre-wrap leading-relaxed">
                                {`--- CUSTOMER MEMORY ---
Customer: Rahul Sharma

Relationship:
- Total conversations: 4
- Last contact: Nov 20, 2025
- Overall sentiment: Positive
- Engagement score: 78/100

Personality: friendly, detail-oriented, price-conscious

Interests: premium features, mobile app integration

Pain points: current solution is slow, poor support

--- RECENT CONVERSATIONS ---
[1] Nov 20, 2025 (callback_requested)
Summary: Discussed enterprise pricing, requested callback
Key points:
  - Interested in annual plan
  - Needs approval from CFO
  - Follow up next week

--- KEY INSIGHTS ---
[PREFERENCE] Prefers morning calls (9-11 AM)
[OBJECTION] Concerned about migration complexity
[OPPORTUNITY] Expanding to 3 new locations
--- END MEMORY ---`}
                            </pre>
                        </div>
                    </>
                ) : (
                    /* Disabled State - Simple */
                    <div className="bg-surface border border-white/10 rounded-xl p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Brain size={24} weight="duotone" className="text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-textMain mb-2">Memory is disabled</h3>
                                <p className="text-sm text-textMuted mb-4">
                                    Enable memory to let your AI assistant remember customer interactions,
                                    extract insights, and provide personalized responses based on conversation history.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Conversation History</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">AI Summaries</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Customer Insights</span>
                                    <span className="px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">Sentiment Tracking</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
export default MemoryTab;
