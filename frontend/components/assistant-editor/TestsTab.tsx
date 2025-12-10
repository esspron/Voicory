import { TestTube, ChatCircle, Check, Play, Sparkle, Lightbulb } from '@phosphor-icons/react';
import React from 'react';

import { Voice } from '../../types';

interface AssistantFormData {
    name: string;
    instruction: string;
}

interface TestsTabProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
}

const TestsTab: React.FC<TestsTabProps> = ({ assistantId }) => {
    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-textMain mb-2">Test Cases</h2>
                    <p className="text-sm text-textMuted">
                        Create automated test scenarios to validate your agent's behavior and responses.
                    </p>
                </div>

                {/* Coming Soon Card */}
                <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-surface/30">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                        <TestTube size={36} weight="duotone" className="text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-textMain mb-3">Automated Testing Coming Soon</h3>
                    <p className="text-sm text-textMuted mb-8 max-w-lg mx-auto leading-relaxed">
                        Create test scenarios with expected inputs and outputs. Run automated tests to ensure your agent 
                        behaves correctly across different conversations and edge cases.
                    </p>
                    
                    {/* Feature Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <ChatCircle size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Conversation Tests</h4>
                            <p className="text-xs text-textMuted">Define multi-turn conversations with expected responses</p>
                        </div>
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <Check size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Assertions</h4>
                            <p className="text-xs text-textMuted">Validate response content, tone, and language</p>
                        </div>
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-left">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <Play size={20} className="text-primary" />
                            </div>
                            <h4 className="text-sm font-medium text-textMain mb-1">Batch Testing</h4>
                            <p className="text-xs text-textMuted">Run all tests with one click before publishing</p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
                        <Sparkle size={16} className="text-primary" />
                        <span className="text-sm text-primary font-medium">Coming in Q1 2026</span>
                    </div>
                </div>

                {/* Tip */}
                <div className="mt-6 p-4 bg-surface/50 border border-white/5 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-textMain mb-1">Pro Tip</h4>
                        <p className="text-xs text-textMuted">
                            Use the <strong className="text-textMain">Chat</strong> button in the header to manually test your agent's 
                            responses before publishing. This helps you verify the configuration is working correctly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default TestsTab;
