import React, { useState, useRef, useEffect } from 'react';
import { Plus, Book, FileText, Link as LinkIcon, Upload, X, ChevronDown } from 'lucide-react';

interface KnowledgeBaseItem {
    id: string;
    name: string;
    documents: DocumentItem[];
}

interface DocumentItem {
    id: string;
    type: 'web' | 'file' | 'text';
    name: string;
    content?: string;
}

const KnowledgeBase: React.FC = () => {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newKbName, setNewKbName] = useState('');
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    
    // Dropdown & Sub-modals state
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [activeModal, setActiveModal] = useState<'web' | 'text' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states for sub-modals
    const [webUrl, setWebUrl] = useState('');
    const [textFileName, setTextFileName] = useState('');
    const [textContent, setTextContent] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAddDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveKb = () => {
        if (newKbName) {
            const newKb: KnowledgeBaseItem = {
                id: Date.now().toString(),
                name: newKbName,
                documents: documents,
            };
            setKnowledgeBases([...knowledgeBases, newKb]);
            resetMainModal();
        }
    };

    const resetMainModal = () => {
        setIsModalOpen(false);
        setNewKbName('');
        setDocuments([]);
        setShowAddDropdown(false);
    };

    const handleAddWebPage = () => {
        if (webUrl) {
            setDocuments([...documents, {
                id: Date.now().toString(),
                type: 'web',
                name: webUrl
            }]);
            setWebUrl('');
            setActiveModal(null);
        }
    };

    const handleAddText = () => {
        if (textFileName && textContent) {
            setDocuments([...documents, {
                id: Date.now().toString(),
                type: 'text',
                name: textFileName,
                content: textContent
            }]);
            setTextFileName('');
            setTextContent('');
            setActiveModal(null);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setDocuments([...documents, {
                id: Date.now().toString(),
                type: 'file',
                name: file.name
            }]);
        }
        setShowAddDropdown(false);
    };

    return (
        <div className="flex h-full bg-background">
            {/* Sub-sidebar */}
            <div className="w-64 border-r border-border bg-surface flex flex-col">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="font-semibold text-textMain">Knowledge Base</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="p-1 hover:bg-surfaceHover rounded-md text-textMain transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {knowledgeBases.length === 0 ? (
                        <div className="text-center py-8 text-textMuted text-sm">
                            No knowledge bases
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {knowledgeBases.map((kb) => (
                                <div 
                                    key={kb.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surfaceHover cursor-pointer text-textMain"
                                >
                                    <Book size={16} className="text-textMuted" />
                                    <span className="text-sm truncate">{kb.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center bg-background">
                {knowledgeBases.length === 0 ? (
                    <div className="text-center">
                        <div className="w-12 h-12 bg-surface border border-border rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Book size={24} className="text-textMuted" />
                        </div>
                        <h3 className="text-textMain font-medium">You don't have any knowledge base</h3>
                    </div>
                ) : (
                    <div className="p-8 w-full h-full">
                        <h2 className="text-2xl font-semibold text-textMain mb-6">Knowledge Base Details</h2>
                        <p className="text-textMuted">Select a knowledge base from the sidebar to view details.</p>
                    </div>
                )}
            </div>

            {/* Add Knowledge Base Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-lg w-[600px] shadow-xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-xl font-semibold text-textMain">Add Knowledge Base</h2>
                            <button 
                                onClick={resetMainModal}
                                className="text-textMuted hover:text-textMain transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Knowledge Base Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter"
                                    value={newKbName}
                                    onChange={(e) => setNewKbName(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-textMain focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Documents
                                </label>
                                <div className="relative" ref={dropdownRef}>
                                    <button 
                                        onClick={() => setShowAddDropdown(!showAddDropdown)}
                                        className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-textMain hover:bg-surfaceHover transition-colors mb-4"
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>

                                    {showAddDropdown && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                                            <button 
                                                onClick={() => {
                                                    setActiveModal('web');
                                                    setShowAddDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceHover text-left transition-colors"
                                            >
                                                <div className="p-1.5 rounded-full bg-background border border-border">
                                                    <LinkIcon size={16} className="text-textMain" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Web Pages</p>
                                                    <p className="text-xs text-textMuted">Crawl and sync your website</p>
                                                </div>
                                            </button>
                                            
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceHover text-left transition-colors"
                                            >
                                                <div className="p-1.5 rounded-full bg-background border border-border">
                                                    <Upload size={16} className="text-textMain" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Upload Files</p>
                                                    <p className="text-xs text-textMuted">File size less than 100MB</p>
                                                </div>
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />

                                            <button 
                                                onClick={() => {
                                                    setActiveModal('text');
                                                    setShowAddDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceHover text-left transition-colors"
                                            >
                                                <div className="p-1.5 rounded-full bg-background border border-border">
                                                    <FileText size={16} className="text-textMain" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-textMain">Add Text</p>
                                                    <p className="text-xs text-textMuted">Add articles manually</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* List of added documents */}
                                {documents.length > 0 && (
                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    {doc.type === 'web' && <LinkIcon size={16} className="text-textMuted" />}
                                                    {doc.type === 'file' && <Upload size={16} className="text-textMuted" />}
                                                    {doc.type === 'text' && <FileText size={16} className="text-textMuted" />}
                                                    <span className="text-sm text-textMain truncate max-w-[300px]">{doc.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setDocuments(documents.filter(d => d.id !== doc.id))}
                                                    className="text-textMuted hover:text-red-500 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button 
                                onClick={resetMainModal}
                                className="px-4 py-2 border border-border rounded-md text-textMain hover:bg-surfaceHover transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveKb}
                                disabled={!newKbName}
                                className={`px-4 py-2 rounded-md text-black font-semibold transition-colors ${!newKbName ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Web Pages Modal */}
            {activeModal === 'web' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-surface border border-border rounded-lg w-[500px] shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-lg font-semibold text-textMain">Add Web Pages</h2>
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="text-textMuted hover:text-textMain transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-textMain mb-2">
                                URL Address
                            </label>
                            <input
                                type="text"
                                placeholder="Enter URL"
                                value={webUrl}
                                onChange={(e) => setWebUrl(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-textMain focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 border border-border rounded-md text-textMain hover:bg-surfaceHover transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddWebPage}
                                className="px-4 py-2 bg-surface text-textMain border border-border rounded-md hover:bg-surfaceHover transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Text Modal */}
            {activeModal === 'text' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-surface border border-border rounded-lg w-[500px] shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-lg font-semibold text-textMain">Add Text</h2>
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="text-textMuted hover:text-textMain transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    File Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter file name"
                                    value={textFileName}
                                    onChange={(e) => setTextFileName(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-textMain focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-textMain mb-2">
                                    Text Content
                                </label>
                                <textarea
                                    placeholder="Enter text content"
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                    rows={6}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-textMain focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 border border-border rounded-md text-textMain hover:bg-surfaceHover transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddText}
                                className="px-4 py-2 bg-surface text-textMain border border-border rounded-md hover:bg-surfaceHover transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBase;
