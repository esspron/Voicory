import React from 'react';
import { GitBranch, Layout } from '@phosphor-icons/react';

const PlaceholderTab: React.FC<{ tabName: string }> = ({ tabName }) => {
    const tabInfo: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
        'workflow': {
            title: 'Workflow Builder',
            description: 'Design complex conversation flows with branching logic and conditions.',
            icon: <GitBranch size={28} weight="duotone" className="text-textMuted" />
        },
        'widget': {
            title: 'Widget Configuration',
            description: 'Customize the embedded widget appearance and behavior.',
            icon: <Layout size={28} weight="duotone" className="text-textMuted" />
        },
    };

    const info = tabInfo[tabName] || { title: tabName, description: '', icon: null };

    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-2xl">
                <div className="border border-dashed border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                        {info.icon}
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">{info.title}</h3>
                    <p className="text-sm text-textMuted mb-4 max-w-md mx-auto">
                        {info.description}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded text-xs text-textMuted">
                        Coming Soon
                    </span>
                </div>
            </div>
        </div>
    );
};


export default PlaceholderTab;
