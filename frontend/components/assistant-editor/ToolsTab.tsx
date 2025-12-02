import React from 'react';
import { Plus, Wrench } from '@phosphor-icons/react';

const ToolsTab: React.FC = () => {
    return (
        <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-textMain">Tools</h2>
                        <p className="text-sm text-textMuted mt-1">
                            Define custom functions that the agent can call during conversations.
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all">
                        <Plus size={16} weight="bold" />
                        Add Tool
                    </button>
                </div>

                {/* Empty State */}
                <div className="border border-dashed border-white/10 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <Wrench size={28} weight="duotone" className="text-textMuted" />
                    </div>
                    <h3 className="text-lg font-medium text-textMain mb-2">No tools configured</h3>
                    <p className="text-sm text-textMuted mb-4 max-w-md mx-auto">
                        Tools allow your agent to perform actions like booking appointments, looking up information, or triggering workflows.
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all mx-auto">
                        <Plus size={16} weight="bold" />
                        Create your first tool
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToolsTab;
