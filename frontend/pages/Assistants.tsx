import React, { useState, useEffect } from 'react';
import { Plus, Search, Bot } from 'lucide-react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { getAssistants } from '../services/callyyService';
import type { Assistant } from '../types';
import AssistantEditor from './AssistantEditor';

const Assistants: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAssistants();
                setAssistants(data);
            } catch (error) {
                console.error('Error loading assistants:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="flex h-full">
            {/* Sidebar List */}
            <div className="w-80 border-r border-border bg-surface flex flex-col">
                <div className="p-4 border-b border-border">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-textMain">Assistants</h2>
                        <button 
                            onClick={() => navigate('/assistants/new')}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search assistants..." 
                            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-12 text-textMuted">Loading assistants...</div>
                    ) : assistants.length === 0 ? (
                        <div className="text-center py-12">
                            <Bot size={48} className="mx-auto mb-4 text-textMuted opacity-50" />
                            <h3 className="text-lg font-semibold text-textMain mb-2">No assistants yet</h3>
                            <p className="text-sm text-textMuted mb-4">Create your first AI assistant to get started</p>
                            <button onClick={() => navigate('/assistants/new')} className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primaryHover">Create Assistant</button>
                        </div>
                    ) : assistants.map(assistant => (
                        <NavLink 
                            to={`/assistants/${assistant.id}`}
                            key={assistant.id}
                            className={({ isActive }) => `
                                flex items-center gap-3 p-4 border-b border-border/50 cursor-pointer transition-colors
                                ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surfaceHover border-l-2 border-l-transparent'}
                            `}
                        >
                            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-primary shrink-0">
                                <Bot size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-medium text-textMain truncate">{assistant.name}</h3>
                                    {assistant.status === 'active' && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                    )}
                                </div>
                                <p className="text-xs text-textMuted truncate">{assistant.model}</p>
                            </div>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 bg-background overflow-hidden">
                {id ? (
                    <AssistantEditor />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-textMuted">
                        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                            <Bot size={32} />
                        </div>
                        <p className="text-lg font-medium text-textMain">Select an assistant</p>
                        <p className="text-sm">Choose an assistant from the sidebar to configure</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Assistants;