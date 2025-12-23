import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  House,
  CalendarX,
  PhoneIncoming,
  UserCircle,
  DoorOpen,
  MapPin,
  PencilSimple,
  MagnifyingGlass,
  Robot,
  ArrowRight,
  Sparkle,
  Phone,
  CaretRight,
  Copy,
  Check,
  Eye,
  Lightning,
  Tag,
  Clock,
  ArrowSquareOut,
  FunnelSimple,
  X,
} from '@phosphor-icons/react';
import { FadeIn } from '../components/ui/FadeIn';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useClipboard } from '../hooks';
import { RE_SCRIPT_TEMPLATES, getTemplateById } from '../data/reScriptTemplates';
import { RE_SCRIPT_CATEGORIES } from '../types/reScripts';
import type { REScript, REScriptCategory } from '../types/reScripts';

// Map category to Phosphor icon
const categoryIconMap: Record<REScriptCategory, React.ElementType> = {
  fsbo: House,
  expired: CalendarX,
  buyer_inquiry: PhoneIncoming,
  seller_followup: UserCircle,
  open_house: DoorOpen,
  circle_prospecting: MapPin,
  custom: PencilSimple,
};

// Preview modal for viewing full script
interface ScriptPreviewModalProps {
  script: REScript;
  onClose: () => void;
  onApply: (script: REScript) => void;
}

const ScriptPreviewModal: React.FC<ScriptPreviewModalProps> = ({ script, onClose, onApply }) => {
  const { copy, copied } = useClipboard(2000);
  const [activeSection, setActiveSection] = useState<'prompt' | 'questions' | 'objections'>('prompt');

  const categoryInfo = RE_SCRIPT_CATEGORIES.find(c => c.id === script.category);
  const Icon = categoryIconMap[script.category] || PencilSimple;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <FadeIn className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20`}>
              <Icon size={28} weight="duotone" className={categoryInfo?.color || 'text-primary'} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-textMain">{script.name}</h2>
              <p className="text-sm text-textMuted">{script.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/5">
          {[
            { id: 'prompt', label: 'System Prompt', count: null },
            { id: 'questions', label: 'Qualification Questions', count: script.qualificationQuestions.length },
            { id: 'objections', label: 'Objection Handlers', count: script.objectionHandlers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                activeSection === tab.id
                  ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20'
                  : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/10 rounded text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'prompt' && (
            <div className="space-y-6">
              {/* First Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-textMain flex items-center gap-2">
                    <Sparkle size={16} weight="fill" className="text-primary" />
                    First Message (Greeting)
                  </label>
                  <button
                    onClick={() => copy(script.firstMessage)}
                    className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-surface/50 border border-white/5 rounded-xl p-4">
                  <p className="text-sm text-textMain whitespace-pre-wrap">{script.firstMessage}</p>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-textMain flex items-center gap-2">
                    <Robot size={16} weight="fill" className="text-primary" />
                    System Prompt
                  </label>
                  <button
                    onClick={() => copy(script.systemPrompt)}
                    className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-surface/50 border border-white/5 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                  <pre className="text-sm text-textMain whitespace-pre-wrap font-sans">{script.systemPrompt}</pre>
                </div>
              </div>

              {/* Variables Used */}
              <div>
                <label className="text-sm font-medium text-textMain mb-2 block">Variables Used</label>
                <div className="flex flex-wrap gap-2">
                  {script.variables.map((v) => (
                    <Badge key={v.name} variant="secondary" size="sm">
                      <code className="text-primary">{`{{${v.name}}}`}</code>
                      <span className="ml-1 text-textMuted">- {v.displayName}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'questions' && (
            <div className="space-y-4">
              {script.qualificationQuestions.map((q, idx) => (
                <div key={idx} className="bg-surface/50 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-textMain mb-1">{q.question}</p>
                      <p className="text-xs text-textMuted mb-2">Purpose: {q.purpose}</p>
                      {q.followUp && (
                        <p className="text-xs text-primary/80 italic">Follow-up: "{q.followUp}"</p>
                      )}
                      {q.scoringImpact && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-textMuted">Lead Score Impact:</span>
                          <div className="flex gap-0.5">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i < q.scoringImpact! ? 'bg-primary' : 'bg-white/10'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'objections' && (
            <div className="space-y-4">
              {script.objectionHandlers.map((obj, idx) => (
                <div key={idx} className="bg-surface/50 border border-white/5 rounded-xl p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-red-400 mb-1">❝ {obj.objection} ❞</p>
                    {obj.tags && obj.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {obj.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-sm text-emerald-300">✓ {obj.response}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/5">
          <div className="flex items-center gap-4 text-sm text-textMuted">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              ~{script.estimatedCallDuration} min call
            </span>
            <span className="flex items-center gap-1.5">
              <Tag size={14} />
              {script.direction === 'inbound' ? 'Inbound' : 'Outbound'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onApply(script)}>
              <Lightning size={16} weight="fill" />
              Use This Template
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

// Main Template Gallery Page
const ScriptTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<REScriptCategory | 'all'>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [previewScript, setPreviewScript] = useState<REScript | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return RE_SCRIPT_TEMPLATES.filter((template) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

      // Direction filter
      const matchesDirection = selectedDirection === 'all' || template.direction === selectedDirection;

      return matchesSearch && matchesCategory && matchesDirection;
    });
  }, [searchQuery, selectedCategory, selectedDirection]);

  // Handle applying a template - navigates to new assistant with template data
  const handleApplyTemplate = (script: REScript) => {
    // Store template in sessionStorage to be read by AssistantEditor
    sessionStorage.setItem('applyScriptTemplate', JSON.stringify(script));
    navigate('/assistants/new?template=re-script');
  };

  return (
    <FadeIn className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-white/5 bg-surface/80 backdrop-blur-xl">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-textMain flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <Robot size={24} weight="duotone" className="text-primary" />
                </div>
                Script Templates
              </h1>
              <p className="text-sm text-textMuted mt-1">
                Pre-built AI scripts for real estate calling campaigns. Choose a template and customize it for your needs.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/assistants/new')}>
              <PencilSimple size={16} weight="bold" />
              Create Custom
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Direction Filter */}
            <div className="flex items-center gap-1 bg-surface/50 border border-white/5 rounded-xl p-1">
              {['all', 'outbound', 'inbound'].map((dir) => (
                <button
                  key={dir}
                  onClick={() => setSelectedDirection(dir as typeof selectedDirection)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    selectedDirection === dir
                      ? 'bg-primary/20 text-primary'
                      : 'text-textMuted hover:text-textMain hover:bg-white/5'
                  }`}
                >
                  {dir === 'all' ? 'All' : dir === 'inbound' ? 'Inbound' : 'Outbound'}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 transition-colors"
              >
                <X size={14} />
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20'
                  : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              All Templates
            </button>
            {RE_SCRIPT_CATEGORIES.filter(c => c.id !== 'custom').map((category) => {
              const Icon = categoryIconMap[category.id];
              const count = RE_SCRIPT_TEMPLATES.filter(t => t.category === category.id).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20'
                      : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <Icon size={16} weight={selectedCategory === category.id ? 'fill' : 'regular'} className={category.color} />
                  {category.name}
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlass size={32} className="text-textMuted" />
            </div>
            <h3 className="text-lg font-medium text-textMain mb-2">No templates found</h3>
            <p className="text-sm text-textMuted">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const categoryInfo = RE_SCRIPT_CATEGORIES.find(c => c.id === template.category);
              const Icon = categoryIconMap[template.category] || PencilSimple;

              return (
                <div
                  key={template.id}
                  className="group relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                  onClick={() => setPreviewScript(template)}
                >
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 ${categoryInfo?.color}`}>
                      <Icon size={14} weight="fill" />
                      <span className="text-xs font-medium">{categoryInfo?.name}</span>
                    </div>
                    <Badge variant={template.direction === 'inbound' ? 'success' : 'default'} size="sm">
                      {template.direction === 'inbound' ? (
                        <>
                          <PhoneIncoming size={12} />
                          Inbound
                        </>
                      ) : (
                        <>
                          <Phone size={12} />
                          Outbound
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Template Name & Description */}
                  <h3 className="text-lg font-semibold text-textMain mb-2 group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-textMuted mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-textMuted">
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      {template.variables.length} variables
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      ~{template.estimatedCallDuration} min
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewScript(template);
                      }}
                    >
                      <Eye size={14} />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                    >
                      <Lightning size={14} weight="fill" />
                      Use Template
                    </Button>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowSquareOut size={20} className="text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewScript && (
        <ScriptPreviewModal
          script={previewScript}
          onClose={() => setPreviewScript(null)}
          onApply={handleApplyTemplate}
        />
      )}
    </FadeIn>
  );
};

export default ScriptTemplates;
