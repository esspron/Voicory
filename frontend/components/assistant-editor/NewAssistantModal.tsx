import {
    X,
    MagnifyingGlass,
    Robot,
    FileText,
    House,
    CalendarBlank,
    PhoneIncoming,
    PhoneOutgoing,
    UserPlus,
    Sparkle,
    CaretRight,
    Plus
} from '@phosphor-icons/react';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { RE_SCRIPT_TEMPLATES, type REScript } from '../../data/reScriptTemplates';
import { RE_SCRIPT_CATEGORIES } from '../../types/reScripts';
import { Badge } from '../ui/Badge';
import { FadeIn } from '../ui/FadeIn';

interface NewAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectBlank: () => void;
    onSelectTemplate: (template: REScript) => void;
}

// Map categories to icons
const categoryIcons: Record<string, React.ElementType> = {
    'fsbo': House,
    'expired': CalendarBlank,
    'buyer': PhoneIncoming,
    'seller': PhoneOutgoing,
    'open-house': UserPlus,
    'cold-call': PhoneOutgoing,
    'follow-up': Robot,
    'custom': FileText,
};

const NewAssistantModal: React.FC<NewAssistantModalProps> = ({
    isOpen,
    onClose,
    onSelectBlank,
    onSelectTemplate
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter templates based on search and category
    const filteredTemplates = useMemo(() => {
        return RE_SCRIPT_TEMPLATES.filter(template => {
            const matchesSearch = searchQuery === '' ||
                template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === null || template.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    // Get unique categories from templates
    const availableCategories = useMemo(() => {
        const cats = new Set(RE_SCRIPT_TEMPLATES.map(t => t.category));
        return RE_SCRIPT_CATEGORIES.filter(c => cats.has(c.id));
    }, []);

    if (!isOpen) return null;

    const handleTemplateSelect = (template: REScript) => {
        onSelectTemplate(template);
        onClose();
    };

    const handleBlankSelect = () => {
        onSelectBlank();
        onClose();
    };

    return createPortal(
        <FadeIn className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[85vh] bg-surface rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-semibold text-textMain">Create New Assistant</h2>
                        <p className="text-sm text-textMuted mt-1">Start from scratch or use a template</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-textMuted hover:text-textMain transition-colors"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="p-4 border-b border-white/5 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlass
                            size={18}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                        />
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                selectedCategory === null
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-textMain border border-transparent'
                            }`}
                        >
                            All
                        </button>
                        {availableCategories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                    selectedCategory === category.id
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-textMain border border-transparent'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Blank Assistant Option */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-textMuted mb-3 flex items-center gap-2">
                            <Sparkle size={14} weight="fill" className="text-primary" />
                            Start Fresh
                        </h3>
                        <button
                            onClick={handleBlankSelect}
                            className="group w-full p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                    <Plus size={24} weight="bold" className="text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-base font-semibold text-textMain group-hover:text-primary transition-colors">
                                        Blank Assistant
                                    </h4>
                                    <p className="text-sm text-textMuted mt-0.5">
                                        Start with a clean slate and configure everything yourself
                                    </p>
                                </div>
                                <CaretRight size={20} weight="bold" className="text-textMuted group-hover:text-primary transition-colors" />
                            </div>
                        </button>
                    </div>

                    {/* Templates Section */}
                    <div>
                        <h3 className="text-sm font-medium text-textMuted mb-3 flex items-center gap-2">
                            <FileText size={14} weight="bold" className="text-primary" />
                            Real Estate Templates
                            <Badge variant="primary" size="sm">{filteredTemplates.length}</Badge>
                        </h3>

                        {filteredTemplates.length === 0 ? (
                            <div className="text-center py-12">
                                <Robot size={48} weight="duotone" className="mx-auto text-textMuted/30 mb-3" />
                                <p className="text-textMuted">No templates match your search</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredTemplates.map(template => {
                                    const CategoryIcon = categoryIcons[template.category] || FileText;
                                    const category = RE_SCRIPT_CATEGORIES.find(c => c.id === template.category);

                                    return (
                                        <button
                                            key={template.id}
                                            onClick={() => handleTemplateSelect(template)}
                                            className="group p-4 bg-surface/50 border border-white/5 rounded-xl hover:border-primary/30 hover:bg-surface/80 transition-all duration-200 text-left"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${category?.color || 'bg-white/10'}`}>
                                                    <CategoryIcon size={20} weight="bold" className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-sm font-semibold text-textMain group-hover:text-primary transition-colors truncate">
                                                            {template.name}
                                                        </h4>
                                                        <Badge
                                                            variant={template.direction === 'inbound' ? 'success' : 'warning'}
                                                            size="sm"
                                                        >
                                                            {template.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-textMuted line-clamp-2">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] text-textMuted/60 uppercase tracking-wider">
                                                            {category?.name}
                                                        </span>
                                                        <span className="text-textMuted/30">•</span>
                                                        <span className="text-[10px] text-textMuted/60">
                                                            {template.variables.length} variables
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </FadeIn>,
        document.body
    );
};

export default NewAssistantModal;
