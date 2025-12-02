import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MagnifyingGlass, Plus, BookOpen, FileText, Globe, X, Gear, Check,
    CircleNotch, ArrowsClockwise, TextAa
} from '@phosphor-icons/react';
import {
    getKnowledgeBases,
    getDocuments,
    KnowledgeBase,
    KnowledgeBaseDocument
} from '../../services/knowledgeBaseService';

interface AssistantFormData {
    ragEnabled: boolean;
    ragSimilarityThreshold: number;
    ragMaxResults: number;
    ragInstructions: string;
    knowledgeBaseIds: string[];
}

interface KnowledgeBaseTabProps {
    formData: AssistantFormData;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({ formData, setFormData }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showRAGConfig, setShowRAGConfig] = useState(false);
    const [showKBSelector, setShowKBSelector] = useState(false);
    const [allKnowledgeBases, setAllKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [linkedDocuments, setLinkedDocuments] = useState<KnowledgeBaseDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Load all knowledge bases
    useEffect(() => {
        const loadKnowledgeBases = async () => {
            setLoading(true);
            try {
                const kbs = await getKnowledgeBases();
                setAllKnowledgeBases(kbs);
            } catch (error) {
                console.error('Error loading knowledge bases:', error);
            } finally {
                setLoading(false);
            }
        };
        loadKnowledgeBases();
    }, []);

    // Load documents for linked knowledge bases
    useEffect(() => {
        const loadDocuments = async () => {
            if (!formData.knowledgeBaseIds || formData.knowledgeBaseIds.length === 0) {
                setLinkedDocuments([]);
                return;
            }

            setLoadingDocs(true);
            try {
                const allDocs: KnowledgeBaseDocument[] = [];
                for (const kbId of formData.knowledgeBaseIds) {
                    const docs = await getDocuments(kbId);
                    allDocs.push(...docs);
                }
                setLinkedDocuments(allDocs);
            } catch (error) {
                console.error('Error loading documents:', error);
            } finally {
                setLoadingDocs(false);
            }
        };
        loadDocuments();
    }, [formData.knowledgeBaseIds]);

    // Get linked knowledge bases
    const linkedKnowledgeBases = allKnowledgeBases.filter(kb => 
        formData.knowledgeBaseIds?.includes(kb.id)
    );

    // Get available (unlinked) knowledge bases
    const availableKnowledgeBases = allKnowledgeBases.filter(kb => 
        !formData.knowledgeBaseIds?.includes(kb.id)
    );

    // Link a knowledge base
    const handleLinkKB = (kbId: string) => {
        const newIds = [...(formData.knowledgeBaseIds || []), kbId];
        setFormData({ ...formData, knowledgeBaseIds: newIds, ragEnabled: true });
        setShowKBSelector(false);
    };

    // Unlink a knowledge base
    const handleUnlinkKB = (kbId: string) => {
        console.log('[KnowledgeBaseTab] handleUnlinkKB called with:', kbId);
        console.log('[KnowledgeBaseTab] Current formData.knowledgeBaseIds:', formData.knowledgeBaseIds);
        const newIds = (formData.knowledgeBaseIds || []).filter(id => id !== kbId);
        console.log('[KnowledgeBaseTab] New IDs after filter:', newIds);
        setFormData({ 
            ...formData, 
            knowledgeBaseIds: newIds,
            ragEnabled: newIds.length > 0 
        });
        console.log('[KnowledgeBaseTab] setFormData called');
    };

    // Filter documents based on search
    const filteredDocuments = linkedDocuments.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get document type icon
    const getDocTypeIcon = (type: string) => {
        switch (type) {
            case 'url': return <Globe size={18} weight="duotone" className="text-blue-400" />;
            case 'file': return <FileText size={18} weight="duotone" className="text-violet-400" />;
            case 'text': return <TextAa size={18} weight="duotone" className="text-emerald-400" />;
            default: return <FileText size={18} weight="duotone" className="text-textMuted" />;
        }
    };

    const getDocTypeBg = (type: string) => {
        switch (type) {
            case 'url': return 'bg-blue-500/10';
            case 'file': return 'bg-violet-500/10';
            case 'text': return 'bg-emerald-500/10';
            default: return 'bg-white/5';
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-textMain">Agent Knowledge Base</h2>
                        <p className="text-sm text-textMuted mt-1">
                            {linkedKnowledgeBases.length > 0 
                                ? `${linkedKnowledgeBases.length} knowledge base${linkedKnowledgeBases.length > 1 ? 's' : ''} linked · ${linkedDocuments.length} documents`
                                : 'Link knowledge bases to give your agent access to documents'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRAGConfig(!showRAGConfig)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm transition-all ${
                                formData.ragEnabled 
                                    ? 'bg-primary/10 border-primary/30 text-primary' 
                                    : 'bg-surface border-white/10 text-textMain hover:bg-white/5'
                            }`}
                        >
                            <Gear size={16} weight="bold" />
                            RAG {formData.ragEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button 
                            onClick={() => setShowKBSelector(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <Plus size={16} weight="bold" />
                            Link Knowledge Base
                        </button>
                    </div>
                </div>

                {/* Linked Knowledge Bases */}
                {linkedKnowledgeBases.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-textMuted mb-3">Linked Knowledge Bases</h3>
                        <div className="flex flex-wrap gap-2">
                            {linkedKnowledgeBases.map(kb => (
                                <div 
                                    key={kb.id}
                                    className="group flex items-center gap-2 px-3 py-2 bg-surface/80 border border-white/10 rounded-xl hover:border-primary/30 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                        <BookOpen size={16} weight="fill" className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-textMain truncate">{kb.name}</p>
                                        <p className="text-xs text-textMuted">{kb.total_documents} documents</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('[UnlinkButton] Clicked! KB:', kb.id);
                                            handleUnlinkKB(kb.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="relative z-20 w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer active:scale-95"
                                        title="Unlink knowledge base"
                                    >
                                        <X size={20} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                {linkedDocuments.length > 0 && (
                    <div className="relative mb-4">
                        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} weight="bold" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                )}

                {/* Loading State */}
                {(loading || loadingDocs) && (
                    <div className="flex items-center justify-center py-12">
                        <CircleNotch size={32} className="animate-spin text-primary" />
                    </div>
                )}

                {/* Documents Grid */}
                {!loading && !loadingDocs && filteredDocuments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map(doc => {
                            const kb = allKnowledgeBases.find(k => k.id === doc.knowledge_base_id);
                            return (
                                <div 
                                    key={doc.id} 
                                    className="group bg-surface/50 border border-white/10 rounded-xl p-4 hover:border-primary/30 hover:bg-white/[0.03] transition-all"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getDocTypeBg(doc.type)}`}>
                                            {getDocTypeIcon(doc.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-textMain truncate">{doc.name}</p>
                                            <p className="text-xs text-textMuted capitalize">{doc.type}</p>
                                            {doc.character_count > 0 && (
                                                <p className="text-xs text-textMuted/60 mt-1">
                                                    {doc.character_count.toLocaleString()} chars
                                                </p>
                                            )}
                                            {kb && (
                                                <p className="text-xs text-primary/60 mt-1 flex items-center gap-1">
                                                    <BookOpen size={10} weight="fill" />
                                                    {kb.name}
                                                </p>
                                            )}
                                            {doc.processing_status === 'processing' && (
                                                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                                    <ArrowsClockwise size={12} className="animate-spin" />
                                                    Processing...
                                                </p>
                                            )}
                                            {doc.processing_status === 'completed' && (
                                                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                                    <Check size={12} weight="bold" />
                                                    Ready
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State - No knowledge bases linked */}
                {!loading && !loadingDocs && linkedKnowledgeBases.length === 0 && (
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={28} weight="duotone" className="text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-textMain mb-2">No knowledge bases linked</h3>
                        <p className="text-sm text-textMuted mb-6 max-w-md mx-auto">
                            Link a knowledge base to give this agent access to your documents. 
                            The agent will use RAG to find relevant information during conversations.
                        </p>
                        <button 
                            onClick={() => setShowKBSelector(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <Plus size={16} weight="bold" />
                            Link Knowledge Base
                        </button>
                    </div>
                )}

                {/* Empty State - Knowledge base linked but no documents */}
                {!loading && !loadingDocs && linkedKnowledgeBases.length > 0 && linkedDocuments.length === 0 && (
                    <div className="bg-surface/50 border border-white/10 rounded-xl p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4">
                            <FileText size={24} weight="duotone" className="text-textMuted" />
                        </div>
                        <h3 className="text-lg font-medium text-textMain mb-2">No documents in linked knowledge bases</h3>
                        <p className="text-sm text-textMuted mb-6">
                            Add documents to your knowledge bases to enable RAG.
                        </p>
                        <a 
                            href="/knowledge-base"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-white/10 rounded-xl text-sm font-medium text-textMain hover:bg-white/5 transition-all"
                        >
                            <BookOpen size={16} weight="bold" />
                            Go to Knowledge Base
                        </a>
                    </div>
                )}
            </div>

            {/* RAG Configuration Sidebar */}
            {showRAGConfig && (
                <div className="w-80 border-l border-white/5 bg-surface/30 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Gear size={18} weight="duotone" className="text-textMuted" />
                            <h3 className="font-medium text-textMain">RAG Configuration</h3>
                        </div>
                        <button
                            onClick={() => setShowRAGConfig(false)}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-textMuted hover:text-textMain transition-all"
                        >
                            <X size={16} weight="bold" />
                        </button>
                    </div>

                    {/* Enable RAG Toggle */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-textMain">Enable RAG</span>
                            <button
                                onClick={() => setFormData({ ...formData, ragEnabled: !formData.ragEnabled })}
                                className={`w-10 h-6 rounded-full transition-colors ${formData.ragEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.ragEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'} mt-0.5`} />
                            </button>
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed">
                            Retrieval-Augmented Generation (RAG) allows the agent to search through linked knowledge bases and include relevant information in responses.
                        </p>
                    </div>

                    {formData.ragEnabled && (
                        <>
                            {/* Similarity Threshold */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Similarity Threshold</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={formData.ragSimilarityThreshold}
                                    onChange={(e) => setFormData({ ...formData, ragSimilarityThreshold: parseFloat(e.target.value) || 0.7 })}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Minimum relevance score (0-1)</p>
                            </div>

                            {/* Max Results */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">Max Results</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.ragMaxResults}
                                    onChange={(e) => setFormData({ ...formData, ragMaxResults: parseInt(e.target.value) || 5 })}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                />
                                <p className="text-xs text-textMuted mt-1">Number of chunks to retrieve</p>
                            </div>

                            {/* RAG Instructions */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-textMain mb-2 block">RAG Instructions</label>
                                <textarea
                                    value={formData.ragInstructions || ''}
                                    onChange={(e) => setFormData({ ...formData, ragInstructions: e.target.value })}
                                    placeholder="How should the agent use retrieved information..."
                                    rows={4}
                                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary resize-none"
                                />
                                <p className="text-xs text-textMuted mt-1">Guide how the agent uses knowledge base content</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Knowledge Base Selector Modal */}
            {showKBSelector && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[500px] shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-semibold text-textMain">Link Knowledge Base</h2>
                                <p className="text-sm text-textMuted mt-1">Select a knowledge base to link to this agent</p>
                            </div>
                            <button
                                onClick={() => setShowKBSelector(false)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {availableKnowledgeBases.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-3">
                                        <BookOpen size={24} weight="duotone" className="text-textMuted" />
                                    </div>
                                    <p className="text-sm text-textMuted mb-4">
                                        {allKnowledgeBases.length === 0 
                                            ? "No knowledge bases found. Create one first."
                                            : "All knowledge bases are already linked."
                                        }
                                    </p>
                                    {allKnowledgeBases.length === 0 && (
                                        <a 
                                            href="/knowledge-base"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
                                        >
                                            <Plus size={16} weight="bold" />
                                            Create Knowledge Base
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableKnowledgeBases.map(kb => (
                                        <button
                                            key={kb.id}
                                            onClick={() => handleLinkKB(kb.id)}
                                            className="w-full flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-primary/30 transition-all text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                                <BookOpen size={20} weight="duotone" className="text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-textMain">{kb.name}</p>
                                                <p className="text-xs text-textMuted">
                                                    {kb.total_documents} documents · {kb.total_characters.toLocaleString()} characters
                                                </p>
                                            </div>
                                            <Plus size={18} className="text-primary" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => setShowKBSelector(false)}
                                className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-textMain hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};



export default KnowledgeBaseTab;
