import { 
    Plus, 
    Books, 
    FileText, 
    Link as LinkIcon, 
    UploadSimple, 
    X, 
    CaretDown, 
    Sparkle, 
    MagnifyingGlass, 
    FolderOpen, 
    Globe, 
    TextAa, 
    CircleNotch, 
    Trash, 
    Warning,
    Lightning,
    Database,
    Brain,
    Article,
    FilePlus,
    DownloadSimple,
    Copy
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import AddWebPagesModal from '../components/AddWebPagesModal';
import { FadeIn } from '../components/ui/FadeIn';
import {
    createFileDocument,
    createTextDocument,
    createKnowledgeBase,
    deleteKnowledgeBase,
    deleteDocumentViaBackend,
    getDocuments,
    getKnowledgeBases,
    getFileDownloadUrl,
    reindexDocument,
    uploadFileDocument,
    ALLOWED_UPLOAD_ACCEPT,
    KnowledgeBase as KnowledgeBaseType,
    KnowledgeBaseDocument,
} from '../services/knowledgeBaseService';

// Skeleton loader component with shimmer effect
const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer rounded ${className}`} {...props} />
);

// Document card skeleton
const DocumentSkeleton = () => (
    <div className="bg-surface/30 border border-white/5 rounded-xl p-4">
        <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    </div>
);

const KnowledgeBase: React.FC = () => {
    // Data state
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseType[]>([]);
    const [selectedKb, setSelectedKb] = useState<KnowledgeBaseType | null>(null);
    const [selectedKbDocuments, setSelectedKbDocuments] = useState<KnowledgeBaseDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWebPagesModalOpen, setIsWebPagesModalOpen] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown & Sub-modals state
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeModal, setActiveModal] = useState<'web' | 'text' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states for sub-modals
    const [textFileName, setTextFileName] = useState('');
    const [textContent, setTextContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Temporary documents for KB creation flow
    const [tempDocuments, setTempDocuments] = useState<Array<{ id: string; type: 'web' | 'file' | 'text'; name: string; content?: string }>>([]);

    // Dropdown ref for modal
    const modalDropdownRef = useRef<HTMLDivElement>(null);
    const [showModalAddDropdown, setShowModalAddDropdown] = useState(false);

    // Load knowledge bases on mount
    useEffect(() => {
        loadKnowledgeBases();
    }, []);

    // Load documents when KB is selected
    useEffect(() => {
        if (selectedKb) {
            loadDocuments(selectedKb.id);
        } else {
            setSelectedKbDocuments([]);
        }
    }, [selectedKb]);

    // Auto-poll: if any docs are in 'processing' state, refresh every 5s
    useEffect(() => {
        const hasProcessing = selectedKbDocuments.some(d => d.processing_status === 'processing');
        if (!hasProcessing || !selectedKb) return;
        const timer = setInterval(() => loadDocuments(selectedKb.id), 5000);
        return () => clearInterval(timer);
    }, [selectedKbDocuments, selectedKb]);

    const loadKnowledgeBases = async () => {
        setIsLoading(true);
        try {
            const kbs = await getKnowledgeBases();
            setKnowledgeBases(kbs);
        } catch (error) {
            console.error('Error loading knowledge bases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDocuments = async (kbId: string) => {
        setIsLoadingDocs(true);
        try {
            const docs = await getDocuments(kbId);
            setSelectedKbDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAddDropdown(false);
            }
            if (modalDropdownRef.current && !modalDropdownRef.current.contains(event.target as Node)) {
                setShowModalAddDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveKb = async () => {
        if (!newKbName.trim()) return;

        setIsSaving(true);
        try {
            console.log('Creating knowledge base:', newKbName.trim());
            const newKb = await createKnowledgeBase(newKbName.trim());
            console.log('Created knowledge base:', newKb);
            if (newKb) {
                // Documents can be added after KB creation via the upload flow
                await loadKnowledgeBases();
                setSelectedKb(newKb);
                resetMainModal();
            } else {
                console.error('Failed to create knowledge base - no result returned');
                alert('Failed to create knowledge base. Please check the console for errors.');
            }
        } catch (error) {
            console.error('Error creating knowledge base:', error);
            alert('Error creating knowledge base: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteKb = async (kbId: string) => {
        if (!confirm('Are you sure you want to delete this knowledge base? All documents will be deleted.')) return;

        try {
            await deleteKnowledgeBase(kbId);
            if (selectedKb?.id === kbId) {
                setSelectedKb(null);
            }
            await loadKnowledgeBases();
        } catch (error) {
            console.error('Error deleting knowledge base:', error);
        }
    };

    const resetMainModal = () => {
        setIsModalOpen(false);
        setNewKbName('');
        setTempDocuments([]);
        setShowAddDropdown(false);
        setShowModalAddDropdown(false);
    };

    // Handle adding temp document for KB creation
    const handleAddTempWebPages = () => {
        setShowModalAddDropdown(false);
        setIsWebPagesModalOpen(true);
    };

    const handleTempWebPagesSuccess = (documentId: string) => {
        // For now, add a placeholder - actual documents will be added after KB creation
        setTempDocuments([...tempDocuments, {
            id: documentId,
            type: 'web',
            name: 'Web Pages'
        }]);
    };

    const handleAddTempText = () => {
        if (textFileName.trim() && textContent.trim()) {
            setTempDocuments([...tempDocuments, {
                id: Date.now().toString(),
                type: 'text',
                name: textFileName.trim(),
                content: textContent.trim()
            }]);
            setTextFileName('');
            setTextContent('');
            setActiveModal(null);
        }
    };

    const handleTempFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setTempDocuments([...tempDocuments, {
                id: Date.now().toString(),
                type: 'file',
                name: file.name
            }]);
        }
        setShowModalAddDropdown(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeTempDocument = (docId: string) => {
        setTempDocuments(tempDocuments.filter(d => d.id !== docId));
    };

    const handleWebPagesSuccess = async (documentId: string) => {
        console.log('Web pages added, document ID:', documentId);
        if (selectedKb) {
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
        }
    };

    const handleAddText = async () => {
        if (!textFileName.trim() || !textContent.trim() || !selectedKb) return;

        setIsSaving(true);
        try {
            await createTextDocument({
                knowledge_base_id: selectedKb.id,
                name: textFileName.trim(),
                text_content: textContent.trim(),
            });
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
            setTextFileName('');
            setTextContent('');
            setActiveModal(null);
        } catch (error) {
            console.error('Error adding text document:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedKb) return;

        setIsSaving(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (['pdf', 'docx', 'doc'].includes(ext)) {
                // Use backend upload for binary formats — backend extracts text + embeds
                await uploadFileDocument(selectedKb.id, file);
            } else {
                // TXT / JSON / MD — use existing direct Supabase path
                await createFileDocument({
                    knowledge_base_id: selectedKb.id,
                    name: file.name,
                    file,
                });
            }
            await loadDocuments(selectedKb.id);
            await loadKnowledgeBases();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsSaving(false);
            setShowAddDropdown(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            // Use backend delete which also removes embedding + storage
            await deleteDocumentViaBackend(docId);
            if (selectedKb) {
                await loadDocuments(selectedKb.id);
                await loadKnowledgeBases();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document. Please try again.');
        }
    };

    const handleReindexDocument = async (docId: string) => {
        try {
            const ok = await reindexDocument(docId);
            if (ok && selectedKb) {
                // Optimistically mark as processing, then reload after short delay
                setSelectedKbDocuments(prev =>
                    prev.map(d => d.id === docId ? { ...d, processing_status: 'processing' } : d)
                );
                setTimeout(() => loadDocuments(selectedKb.id), 5000);
            }
        } catch (error) {
            console.error('Error reindexing document:', error);
            alert('Failed to start reindexing. Please try again.');
        }
    };

    const handleDownloadDocument = async (doc: KnowledgeBaseDocument) => {
        try {
            if (doc.storage_path) {
                const url = await getFileDownloadUrl(doc.storage_path);
                if (url) {
                    window.open(url, '_blank');
                    return;
                }
            }
            // Fallback: download text content
            const content = (doc as any).text_content || (doc as any).content || '';
            if (content) {
                const blob = new Blob([content], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${doc.name}.txt`;
                a.click();
                URL.revokeObjectURL(a.href);
            }
        } catch (error) {
            console.error('Error downloading document:', error);
        }
    };

    // Filter knowledge bases based on search
    const filteredKbs = knowledgeBases.filter(kb =>
        kb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <FadeIn className="flex h-full bg-background">
            {/* Sub-sidebar */}
            <div className="w-72 border-r border-white/5 bg-surface/30 backdrop-blur-xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center">
                                <Brain size={20} weight="duotone" className="text-primary" />
                            </div>
                            <h2 className="font-semibold text-textMain">Knowledge Base</h2>
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                {knowledgeBases.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group p-2 bg-gradient-to-br from-primary to-primary/80 text-black rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5"
                            title="Create knowledge base"
                        >
                            <Plus size={18} weight="bold" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <MagnifyingGlass
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted/50 group-focus-within:text-primary transition-colors"
                            size={16}
                            weight="bold"
                        />
                        <input
                            type="text"
                            placeholder="Search knowledge bases..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {isLoading ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 rounded-xl" />
                            ))}
                        </div>
                    ) : knowledgeBases.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <Books size={28} weight="duotone" className="text-primary/40" />
                            </div>
                            <p className="text-sm font-medium text-textMain mb-1">No knowledge bases</p>
                            <p className="text-xs text-textMuted/60">Create your first one to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredKbs.map((kb) => (
                                <button
                                    key={kb.id}
                                    onClick={() => setSelectedKb(kb)}
                                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${selectedKb?.id === kb.id
                                        ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-l-primary'
                                        : 'hover:bg-white/[0.03] border-l-2 border-l-transparent hover:border-l-white/20'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedKb?.id === kb.id
                                        ? 'bg-gradient-to-br from-primary/20 to-primary/10'
                                        : 'bg-gradient-to-br from-white/10 to-white/5 group-hover:from-primary/15 group-hover:to-primary/5'
                                        }`}>
                                        <Database size={18} weight={selectedKb?.id === kb.id ? "fill" : "duotone"} className={selectedKb?.id === kb.id ? 'text-primary' : 'text-textMuted group-hover:text-primary transition-colors'} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className={`text-sm font-medium truncate ${selectedKb?.id === kb.id ? 'text-textMain' : 'text-textMain/80 group-hover:text-textMain'}`}>
                                            {kb.name}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <Article size={10} weight="bold" className="text-textMuted/40" />
                                            <p className="text-xs text-textMuted/60">{kb.total_documents} documents</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center bg-background overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="animate-pulse w-16 h-16 rounded-2xl bg-white/5 mb-4" />
                        <Skeleton className="w-40 h-6 mb-2" />
                        <Skeleton className="w-32 h-4" />
                    </div>
                ) : knowledgeBases.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-textMuted">
                        {/* Ambient background */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
                        </div>

                        <div className="relative">
                            {/* Floating sparkles */}
                            <Sparkle size={16} weight="fill" className="absolute -top-8 -left-6 text-primary/40 animate-pulse" />
                            <Sparkle size={12} weight="fill" className="absolute -top-4 right-0 text-violet-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <Lightning size={14} weight="fill" className="absolute bottom-0 -left-8 text-cyan-400/40 animate-pulse" style={{ animationDelay: '1s' }} />

                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-2xl blur-xl animate-pulse" />
                                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-surface to-surface/80 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <Brain size={40} weight="duotone" className="text-primary" />
                                </div>
                            </div>
                        </div>

                        <p className="text-xl font-semibold text-textMain mb-2">No knowledge bases yet</p>
                        <p className="text-sm text-textMuted/60 max-w-xs text-center">
                            Create a knowledge base to give your AI assistants access to your documents and data
                        </p>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-textMain font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                        >
                            <Plus size={18} weight="bold" />
                            Create Knowledge Base
                        </button>
                    </div>
                ) : selectedKb ? (
                    <div className="p-8 w-full h-full overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            {/* Header - Clean Style */}
                            <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/5">
                                <div>
                                    <h2 className="text-xl font-bold text-textMain mb-1">{selectedKb.name}</h2>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-textMuted/60">ID: know...{selectedKb.id.slice(-3)}</span>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(selectedKb.id)}
                                            className="text-textMuted/40 hover:text-textMuted transition-colors"
                                            title="Copy ID"
                                        >
                                            <Copy size={14} weight="bold" />
                                        </button>
                                        <span className="text-textMuted/40">•</span>
                                        {selectedKbDocuments.some(d => d.processing_status === 'processing') ? (
                                            <span className="flex items-center gap-1.5 text-blue-400">
                                                <CircleNotch size={14} weight="bold" className="animate-spin" />
                                                In progress
                                            </span>
                                        ) : selectedKbDocuments.length > 0 && selectedKbDocuments.every(d => d.has_embedding) ? (
                                            <span className="flex items-center gap-1.5 text-emerald-400">
                                                <Lightning size={14} weight="fill" />
                                                RAG Ready
                                            </span>
                                        ) : (
                                            <span className="text-textMuted/60">{selectedKbDocuments.length} documents</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Edit Button */}
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 text-textMain font-medium rounded-xl hover:bg-white/5 transition-all"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        Edit
                                    </button>
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDeleteKb(selectedKb.id)}
                                        className="p-2 text-textMuted border border-white/10 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Delete Knowledge Base"
                                    >
                                        <Trash size={18} weight="bold" />
                                    </button>
                                </div>
                            </div>

                            {/* Add Document Button */}
                            <div className="mb-6">
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setShowAddDropdown(!showAddDropdown)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-all border border-primary/20"
                                    >
                                        <Plus size={16} weight="bold" />
                                        Add Document
                                        <CaretDown size={14} weight="bold" className={`transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showAddDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/20 z-10 overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    setShowAddDropdown(false);
                                                    setIsWebPagesModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 flex items-center justify-center group-hover:border-blue-500/40 transition-colors">
                                                    <Globe size={18} weight="duotone" className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Web Pages</p>
                                                    <p className="text-xs text-textMuted/60">Crawl and sync your website</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setShowAddDropdown(false);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/20 flex items-center justify-center group-hover:border-violet-500/40 transition-colors">
                                                    <UploadSimple size={18} weight="duotone" className="text-violet-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Upload Files</p>
                                                    <p className="text-xs text-textMuted/60">PDF, DOCX, TXT, JSON, MD up to 20MB</p>
                                                </div>
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".pdf,.docx,.doc,.txt,.json,.md"
                                                onChange={handleFileUpload}
                                            />

                                            <button
                                                onClick={() => {
                                                    setActiveModal('text');
                                                    setShowAddDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/40 transition-colors">
                                                    <TextAa size={18} weight="duotone" className="text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Text</p>
                                                    <p className="text-xs text-textMuted/60">Add articles manually</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documents List */}
                            {isLoadingDocs ? (
                                <div className="border border-white/5 rounded-xl overflow-hidden bg-surface/20">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i !== 3 ? 'border-b border-white/5' : ''}`}>
                                            <Skeleton className="w-10 h-10 rounded-lg" />
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-32 mb-1.5" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedKbDocuments.length === 0 ? (
                                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center bg-white/[0.01]">
                                    <div className="relative w-16 h-16 mx-auto mb-4">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-2xl blur-xl" />
                                        <div className="relative w-full h-full rounded-2xl bg-surface border border-white/10 flex items-center justify-center">
                                            <FilePlus size={28} weight="duotone" className="text-primary/60" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-medium text-textMain mb-2">No documents yet</h3>
                                    <p className="text-sm text-textMuted/60 mb-5">Add documents to power your AI with knowledge</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => setIsWebPagesModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-400 font-medium rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                                        >
                                            <Globe size={16} weight="bold" />
                                            Add Web Pages
                                        </button>
                                        <button
                                            onClick={() => setActiveModal('text')}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 font-medium rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                        >
                                            <TextAa size={16} weight="bold" />
                                            Add Text
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-white/5 rounded-xl overflow-hidden bg-surface/20">
                                    {selectedKbDocuments.map((doc, index) => (
                                        <div 
                                            key={doc.id} 
                                            className={`group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-all ${
                                                index !== selectedKbDocuments.length - 1 ? 'border-b border-white/5' : ''
                                            }`}
                                        >
                                            {/* Document Icon */}
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                doc.type === 'url' ? 'bg-blue-500/10' :
                                                doc.type === 'file' ? 'bg-orange-500/10' :
                                                    'bg-amber-500/10'
                                                }`}>
                                                {doc.type === 'url' && <Globe size={20} weight="fill" className="text-blue-400" />}
                                                {doc.type === 'file' && (
                                                    <div className="relative">
                                                        <FileText size={20} weight="fill" className="text-orange-400" />
                                                    </div>
                                                )}
                                                {doc.type === 'text' && (
                                                    <div className="relative">
                                                        <FileText size={20} weight="fill" className="text-amber-400" />
                                                        <span className="absolute -bottom-0.5 -right-0.5 text-[6px] font-bold bg-red-500 text-white px-0.5 rounded">TXT</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Document Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-textMain truncate">{doc.name}</p>
                                                <p className="text-xs text-textMuted/60">
                                                    {doc.character_count > 0 
                                                        ? `${Math.round(doc.character_count / 1000)} K` 
                                                        : '0 K'}
                                                </p>
                                            </div>
                                            
                                            {/* Status */}
                                            {doc.processing_status === 'processing' && (
                                                <div className="flex items-center gap-1.5 text-yellow-400">
                                                    <CircleNotch size={14} weight="bold" className="animate-spin" />
                                                    <span className="text-xs">Processing...</span>
                                                </div>
                                            )}
                                            {doc.processing_status === 'failed' && (
                                                <div className="flex items-center gap-1.5 text-red-400">
                                                    <Warning size={14} weight="fill" />
                                                    <span className="text-xs">Failed</span>
                                                </div>
                                            )}
                                            
                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Re-index */}
                                                <button
                                                    onClick={() => handleReindexDocument(doc.id)}
                                                    className="p-1.5 text-textMuted/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Re-index (re-generate embedding)"
                                                >
                                                    <Lightning size={16} weight="bold" />
                                                </button>
                                                {/* Download */}
                                                <button
                                                    onClick={() => handleDownloadDocument(doc)}
                                                    className="p-1.5 text-textMuted/40 hover:text-textMuted hover:bg-white/5 rounded-lg transition-all"
                                                    title="Download document"
                                                >
                                                    <DownloadSimple size={16} weight="bold" />
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="p-1.5 text-textMuted/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Delete document"
                                                >
                                                    <Trash size={16} weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        {/* Ambient background for empty state */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                        </div>
                        
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface to-surface/80 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                <FolderOpen size={32} weight="duotone" className="text-primary/40" />
                            </div>
                            <p className="text-lg font-medium text-textMain mb-1">Select a knowledge base</p>
                            <p className="text-sm text-textMuted/60">Choose one from the sidebar to view details</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Web Pages Modal */}
            <AddWebPagesModal
                isOpen={isWebPagesModalOpen}
                onClose={() => setIsWebPagesModalOpen(false)}
                onSuccess={handleWebPagesSuccess}
                knowledgeBaseId={selectedKb?.id || ''}
            />

            {/* Add Knowledge Base Modal - Retell Style */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[700px] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h2 className="text-xl font-semibold text-textMain">Add Knowledge Base</h2>
                            <button
                                onClick={resetMainModal}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Knowledge Base Name */}
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Knowledge Base Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter"
                                    value={newKbName}
                                    onChange={(e) => setNewKbName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Documents Section */}
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-3">
                                    Documents
                                </label>
                                <div className="relative" ref={modalDropdownRef}>
                                    <button
                                        onClick={() => setShowModalAddDropdown(!showModalAddDropdown)}
                                        className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-textMain hover:bg-white/[0.05] transition-all"
                                    >
                                        <Plus size={18} weight="bold" />
                                        Add
                                    </button>

                                    {showModalAddDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-80 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                                            <button
                                                onClick={handleAddTempWebPages}
                                                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 text-left transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <Globe size={22} weight="regular" className="text-textMuted" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Web Pages</p>
                                                    <p className="text-xs text-textMuted/60">Crawl and sync your website</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setShowModalAddDropdown(false);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 text-left transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <UploadSimple size={22} weight="regular" className="text-textMuted" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Upload Files</p>
                                                    <p className="text-xs text-textMuted/60">PDF, DOCX, TXT, JSON, MD up to 20MB</p>
                                                </div>
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".pdf,.docx,.doc,.txt,.json,.md"
                                                onChange={handleTempFileUpload}
                                            />

                                            <button
                                                onClick={() => {
                                                    setShowModalAddDropdown(false);
                                                    setActiveModal('text');
                                                }}
                                                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 text-left transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <TextAa size={22} weight="regular" className="text-textMuted" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Text</p>
                                                    <p className="text-xs text-textMuted/60">Add articles manually</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* List of added documents */}
                                {tempDocuments.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {tempDocuments.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${doc.type === 'web' ? 'bg-blue-500/10' :
                                                            doc.type === 'file' ? 'bg-violet-500/10' :
                                                                'bg-emerald-500/10'
                                                        }`}>
                                                        {doc.type === 'web' && <Globe size={16} weight="duotone" className="text-blue-400" />}
                                                        {doc.type === 'file' && <UploadSimple size={16} weight="duotone" className="text-violet-400" />}
                                                        {doc.type === 'text' && <TextAa size={16} weight="duotone" className="text-emerald-400" />}
                                                    </div>
                                                    <span className="text-sm text-textMain truncate max-w-[400px]">{doc.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeTempDocument(doc.id)}
                                                    className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <X size={14} weight="bold" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={resetMainModal}
                                className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-textMain hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveKb}
                                disabled={!newKbName.trim() || isSaving}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${!newKbName.trim() || isSaving
                                        ? 'bg-white/10 text-textMuted cursor-not-allowed'
                                        : 'bg-gradient-to-r from-primary to-primary/80 text-black hover:shadow-lg hover:shadow-primary/25'
                                    }`}
                            >
                                {isSaving && <CircleNotch size={16} weight="bold" className="animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Web Pages Modal */}
            {/* Add Text Modal */}
            {activeModal === 'text' && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-[500px] shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                                    <TextAa size={22} weight="duotone" className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-textMain">Add Text</h2>
                                    <p className="text-sm text-textMuted/70">Add content manually</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
                            >
                                <X size={18} weight="bold" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Document Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter document name"
                                    value={textFileName}
                                    onChange={(e) => setTextFileName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Text Content
                                    <span className="text-xs text-textMuted/60 ml-2">(max 10,000 characters)</span>
                                </label>
                                <textarea
                                    placeholder="Enter your text content here..."
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value.slice(0, 10000))}
                                    rows={8}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                                />
                                <p className="text-xs text-textMuted/50 mt-1 text-right">
                                    {textContent.length.toLocaleString()} / 10,000
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-textMain hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddText}
                                disabled={!textFileName.trim() || !textContent.trim() || isSaving}
                                className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${!textFileName.trim() || !textContent.trim() || isSaving
                                    ? 'bg-emerald-500/30 text-white/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                                    }`}
                            >
                                {isSaving && <CircleNotch size={16} weight="bold" className="animate-spin" />}
                                Add Text
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </FadeIn>
    );
};

export default KnowledgeBase;
