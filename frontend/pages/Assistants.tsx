import { Plus, Robot, Sparkle, CircleNotch, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';

import { AmbientBackground } from '../components/ui/AmbientBackground';
import { FadeIn } from '../components/ui/FadeIn';
import { getAssistants } from '../services/voicoryService';
import type { Assistant } from '../types';
import { useGPUCapabilities } from '../utils/gpuDetection';

import AssistantEditor from './AssistantEditor';

// Skeleton loader for list items
const AssistantSkeleton = () => (
    <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/5 animate-pulse" />
        <div className="flex-1 space-y-2">
            <div className="h-4 w-28 bg-gradient-to-r from-white/10 to-white/5 rounded-md animate-pulse" />
            <div className="h-3 w-20 bg-gradient-to-r from-white/5 to-transparent rounded-md animate-pulse" />
        </div>
    </div>
);

const Assistants: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubSidebarCollapsed, setIsSubSidebarCollapsed] = useState(false);
    const prevIdRef = useRef<string | undefined>(id);

    const fetchAssistants = async () => {
        try {
            const data = await getAssistants();
            setAssistants(data);
        } catch (error) {
            console.error('Error loading assistants:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchAssistants();
    }, []);

    // Refresh list when route changes (create, save, delete)
    useEffect(() => {
        const prevId = prevIdRef.current;
        prevIdRef.current = id;

        // Refresh when:
        // 1. Navigating to a different existing assistant (after save)
        // 2. Navigating back to /assistants (after delete - id becomes undefined)
        if ((id && id !== 'new' && id !== prevId) || (prevId && !id)) {
            fetchAssistants();
        }
    }, [id]);

    const handleCreateNew = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigate('/assistants/new');
    };

    return (
        <FadeIn className="flex h-full relative">
            {/* Collapsible Sidebar List */}
            <div className={`${isSubSidebarCollapsed ? 'w-0' : 'w-64'} border-r border-white/5 bg-surface/50 backdrop-blur-xl flex flex-col transition-all duration-300 overflow-hidden`}>
                {/* Header */}
                <div className="p-3 border-b border-white/5 min-w-64">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-textMain">Assistants</h2>
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                {assistants.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateNew}
                            className="group p-2.5 bg-gradient-to-br from-primary to-primary/80 text-black rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 relative z-20 cursor-pointer"
                            title="Create new assistant"
                        >
                            <Plus size={18} weight="bold" className="pointer-events-none" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scrollbar-none min-w-64">
                    {loading ? (
                        <>
                            <AssistantSkeleton />
                            <AssistantSkeleton />
                            <AssistantSkeleton />
                        </>
                    ) : assistants.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <div className="relative w-20 h-20 mx-auto mb-5">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl blur-xl" />
                                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-surface to-surface/50 border border-white/10 flex items-center justify-center">
                                    <Robot size={36} weight="duotone" className="text-primary" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-textMain mb-2">No assistants yet</h3>
                            <p className="text-sm text-textMuted/70 mb-5">Create your first AI assistant to get started</p>
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 relative z-20 cursor-pointer"
                            >
                                <Plus size={18} weight="bold" className="pointer-events-none" />
                                Create Assistant
                            </button>
                        </div>
                    ) : assistants.map(assistant => (
                        <NavLink
                            to={`/assistants/${assistant.id}`}
                            key={assistant.id}
                            className={({ isActive }) => `
                                group flex items-center gap-3 p-4 border-b border-white/5 cursor-pointer transition-all duration-200
                                ${isActive
                                    ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-l-primary'
                                    : 'hover:bg-white/[0.03] border-l-2 border-l-transparent hover:border-l-white/20'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    {assistant.status === 'active' && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-medium truncate transition-colors capitalize ${isActive ? 'text-textMain' : 'text-textMain/80 group-hover:text-textMain'}`}>
                                            {assistant.name}
                                        </h3>
                                        {assistant.title && (
                                            <p className="text-xs text-textMuted/60 truncate mt-0.5 capitalize">{assistant.title}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsSubSidebarCollapsed(!isSubSidebarCollapsed)}
                className="absolute left-[calc(var(--sidebar-width)-12px)] top-20 z-10 flex items-center justify-center w-6 h-12 bg-surface border border-white/10 rounded-r-lg hover:bg-surfaceHover hover:border-primary/30 transition-all duration-200 group"
                style={{ '--sidebar-width': isSubSidebarCollapsed ? '0px' : '256px' } as React.CSSProperties}
                title={isSubSidebarCollapsed ? "Show assistants" : "Hide assistants"}
            >
                {isSubSidebarCollapsed ? (
                    <CaretRight size={14} weight="bold" className="text-textMuted group-hover:text-primary transition-colors" />
                ) : (
                    <CaretLeft size={14} weight="bold" className="text-textMuted group-hover:text-primary transition-colors" />
                )}
            </button>

            {/* Main Content - Editor */}
            <div className="flex-1 bg-background overflow-hidden">
                {id ? (
                    <AssistantEditor />
                ) : (
                    <EmptyState onCreateNew={() => navigate('/assistants/new')} />
                )}
            </div>
        </FadeIn>
    );
};

/**
 * Empty state component with GPU-aware ambient background
 */
const EmptyState: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { shouldUseSimpleEffects, prefersReducedMotion } = useGPUCapabilities();

    return (
        <div className="h-full flex flex-col items-center justify-center text-textMuted relative">
            {/* GPU-aware ambient background */}
            <AmbientBackground />

            <div className="relative z-10">
                {/* Floating sparkles - skip if reduced motion or low-end */}
                {!shouldUseSimpleEffects && (
                    <>
                        <Sparkle size={16} weight="fill" className="absolute -top-8 -left-6 text-primary/40 animate-pulse" />
                        <Sparkle size={12} weight="fill" className="absolute -top-4 right-0 text-violet-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <Sparkle size={14} weight="fill" className="absolute bottom-0 -left-8 text-cyan-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
                    </>
                )}

                <div className="relative w-20 h-20 mb-6">
                    {/* Glow effect - simplified for low-end devices */}
                    {!shouldUseSimpleEffects ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl blur-xl opacity-60" />
                    ) : (
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
                    )}
                    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-surface to-surface/80 border border-white/10 flex items-center justify-center">
                        <Robot size={40} weight="duotone" className="text-primary" />
                    </div>
                </div>
            </div>

            <p className="text-xl font-semibold text-textMain mb-2 relative z-10">Select an assistant</p>
            <p className="text-sm text-textMuted/60 max-w-xs text-center relative z-10">
                Choose an assistant from the sidebar to configure, or create a new one
            </p>

            <button
                onClick={onCreateNew}
                className="mt-6 relative z-10 inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-textMain font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
                <Plus size={18} weight="bold" />
                New Assistant
            </button>
        </div>
    );
};

export default Assistants;