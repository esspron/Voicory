import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Trash,
  FloppyDisk,
  BookBookmark,
  Plus,
  Warning,
} from '@phosphor-icons/react';
import { FadeIn } from '../components/ui/FadeIn';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useClipboard } from '../hooks';
import { RE_SCRIPT_TEMPLATES } from '../data/reScriptTemplates';
import { RE_SCRIPT_CATEGORIES } from '../types/reScripts';
import type { REScript, REScriptCategory } from '../types/reScripts';
import { authFetch } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  first_message?: string;
  industry?: string;
  category: string;
  direction: string;
  tags: string[];
  variables: unknown[];
  qualification_questions: unknown[];
  objection_handlers: unknown[];
  estimated_call_duration?: number;
  source_template_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const categoryIconMap: Record<REScriptCategory, React.ElementType> = {
  fsbo: House,
  expired: CalendarX,
  buyer_inquiry: PhoneIncoming,
  seller_followup: UserCircle,
  open_house: DoorOpen,
  circle_prospecting: MapPin,
  custom: PencilSimple,
};

// ─── Toast helper ─────────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: 'success' | 'error' }

const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
};

// ─── Save-to-my-templates modal ───────────────────────────────────────────────

interface SaveModalProps {
  script: REScript;
  onClose: () => void;
  onSaved: (tpl: SavedTemplate) => void;
}

const SaveModal: React.FC<SaveModalProps> = ({ script, onClose, onSaved }) => {
  const [name, setName] = useState(script.name);
  const [description, setDescription] = useState(script.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/script-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          system_prompt: script.systemPrompt,
          first_message: script.firstMessage,
          category: script.category,
          direction: script.direction,
          tags: script.tags,
          variables: script.variables,
          qualification_questions: script.qualificationQuestions,
          objection_handlers: script.objectionHandlers,
          estimated_call_duration: script.estimatedCallDuration,
          source_template_id: script.id,
          industry: 'real_estate',
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Save failed');
      }
      const saved: SavedTemplate = await res.json();
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <FadeIn className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-textMain flex items-center gap-2">
            <FloppyDisk size={20} weight="duotone" className="text-primary" />
            Save to My Templates
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-textMain mb-1.5 block">Template Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="My FSBO Script" />
          </div>
          <div>
            <label className="text-sm font-medium text-textMain mb-1.5 block">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
          </div>
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <Warning size={16} /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <FloppyDisk size={16} weight="fill" />
            {saving ? 'Saving…' : 'Save Template'}
          </Button>
        </div>
      </FadeIn>
    </div>
  );
};

// ─── Script Preview Modal ─────────────────────────────────────────────────────

interface ScriptPreviewModalProps {
  script: REScript;
  onClose: () => void;
  onApply: (script: REScript) => void;
  onSave: (script: REScript) => void;
}

const ScriptPreviewModal: React.FC<ScriptPreviewModalProps> = ({ script, onClose, onApply, onSave }) => {
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Icon size={28} weight="duotone" className={categoryInfo?.color || 'text-primary'} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-textMain">{script.name}</h2>
              <p className="text-sm text-textMuted">{script.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-xl text-textMuted hover:text-textMain transition-all">
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-textMain flex items-center gap-2">
                    <Sparkle size={16} weight="fill" className="text-primary" />
                    First Message (Greeting)
                  </label>
                  <button onClick={() => copy(script.firstMessage)} className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-surface/50 border border-white/5 rounded-xl p-4">
                  <p className="text-sm text-textMain whitespace-pre-wrap">{script.firstMessage}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-textMain flex items-center gap-2">
                    <Robot size={16} weight="fill" className="text-primary" />
                    System Prompt
                  </label>
                  <button onClick={() => copy(script.systemPrompt)} className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-surface/50 border border-white/5 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                  <pre className="text-sm text-textMain whitespace-pre-wrap font-sans">{script.systemPrompt}</pre>
                </div>
              </div>
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
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-textMain mb-1">{q.question}</p>
                      <p className="text-xs text-textMuted mb-2">Purpose: {q.purpose}</p>
                      {q.followUp && <p className="text-xs text-primary/80 italic">Follow-up: "{q.followUp}"</p>}
                      {q.scoringImpact && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-textMuted">Lead Score Impact:</span>
                          <div className="flex gap-0.5">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < q.scoringImpact! ? 'bg-primary' : 'bg-white/10'}`} />
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
                          <span key={tag} className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">{tag}</span>
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
            <span className="flex items-center gap-1.5"><Clock size={14} />~{script.estimatedCallDuration} min call</span>
            <span className="flex items-center gap-1.5"><Tag size={14} />{script.direction === 'inbound' ? 'Inbound' : 'Outbound'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="outline" onClick={() => onSave(script)}>
              <FloppyDisk size={16} weight="fill" />
              Save to My Templates
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

// ─── My Templates Tab ─────────────────────────────────────────────────────────

interface MyTemplatesTabProps {
  templates: SavedTemplate[];
  loading: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onApplyToAssistant: (tpl: SavedTemplate) => void;
  onCreateNew: () => void;
}

const MyTemplatesTab: React.FC<MyTemplatesTabProps> = ({
  templates,
  loading,
  onDelete,
  onDuplicate,
  onApplyToAssistant,
  onCreateNew,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
          <BookBookmark size={32} className="text-textMuted" />
        </div>
        <h3 className="text-lg font-medium text-textMain mb-2">No saved templates yet</h3>
        <p className="text-sm text-textMuted mb-6">
          Browse the gallery and save templates, or create one from scratch.
        </p>
        <Button onClick={onCreateNew}>
          <Plus size={16} weight="bold" />
          Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <div key={tpl.id} className="group bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-all">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={tpl.direction === 'inbound' ? 'success' : 'default'} size="sm">
                {tpl.direction === 'inbound' ? 'Inbound' : 'Outbound'}
              </Badge>
              <span className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">{tpl.category}</span>
            </div>
          </div>

          {/* Name & description */}
          <h3 className="text-base font-semibold text-textMain mb-1 group-hover:text-primary transition-colors">
            {tpl.name}
          </h3>
          {tpl.description && (
            <p className="text-sm text-textMuted mb-3 line-clamp-2">{tpl.description}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-textMuted mb-4">
            {tpl.estimated_call_duration && (
              <span className="flex items-center gap-1"><Clock size={12} />~{tpl.estimated_call_duration} min</span>
            )}
            {tpl.source_template_id && (
              <span className="flex items-center gap-1 text-primary/60"><BookBookmark size={12} />From gallery</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onApplyToAssistant(tpl)}
            >
              <Lightning size={14} weight="fill" />
              Use
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setDuplicatingId(tpl.id);
                await onDuplicate(tpl.id);
                setDuplicatingId(null);
              }}
              disabled={duplicatingId === tpl.id}
            >
              <Copy size={14} />
              {duplicatingId === tpl.id ? '…' : 'Duplicate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
              onClick={async () => {
                setDeletingId(tpl.id);
                await onDelete(tpl.id);
                setDeletingId(null);
              }}
              disabled={deletingId === tpl.id}
            >
              <Trash size={14} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main ScriptTemplates Page ────────────────────────────────────────────────

const ScriptTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, show: showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'gallery' | 'mine'>('gallery');

  // Gallery state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<REScriptCategory | 'all'>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [previewScript, setPreviewScript] = useState<REScript | null>(null);
  const [saveModalScript, setSaveModalScript] = useState<REScript | null>(null);

  // My templates state
  const [myTemplates, setMyTemplates] = useState<SavedTemplate[]>([]);
  const [myTemplatesLoading, setMyTemplatesLoading] = useState(false);
  const [myTemplatesFetched, setMyTemplatesFetched] = useState(false);

  // Load my templates when that tab is activated
  useEffect(() => {
    if (activeTab === 'mine' && !myTemplatesFetched) {
      fetchMyTemplates();
    }
  }, [activeTab]);

  const fetchMyTemplates = async () => {
    setMyTemplatesLoading(true);
    try {
      const res = await authFetch('/api/script-templates');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setMyTemplates(data.templates || []);
      setMyTemplatesFetched(true);
    } catch (e) {
      showToast('Failed to load your templates', 'error');
    } finally {
      setMyTemplatesLoading(false);
    }
  };

  // Filtered gallery templates
  const filteredTemplates = useMemo(() => {
    return RE_SCRIPT_TEMPLATES.filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesDirection = selectedDirection === 'all' || template.direction === selectedDirection;
      return matchesSearch && matchesCategory && matchesDirection;
    });
  }, [searchQuery, selectedCategory, selectedDirection]);

  // Apply a gallery system template → navigate to new assistant
  const handleApplyTemplate = (script: REScript) => {
    sessionStorage.setItem('applyScriptTemplate', JSON.stringify(script));
    navigate('/assistants/new?template=re-script');
  };

  // Apply a saved template → navigate to new assistant
  const handleApplySavedTemplate = (tpl: SavedTemplate) => {
    // Convert SavedTemplate to REScript-compatible shape for AssistantEditor
    const asScript = {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description || '',
      category: tpl.category,
      direction: tpl.direction,
      systemPrompt: tpl.system_prompt,
      firstMessage: tpl.first_message || '',
      variables: tpl.variables || [],
      qualificationQuestions: tpl.qualification_questions || [],
      objectionHandlers: tpl.objection_handlers || [],
      tags: tpl.tags || [],
      isSystemTemplate: false,
    };
    sessionStorage.setItem('applyScriptTemplate', JSON.stringify(asScript));
    navigate('/assistants/new?template=re-script');
  };

  // Save a gallery template to user's collection
  const handleSaveTemplate = async (tpl: SavedTemplate) => {
    setMyTemplates(prev => [tpl, ...prev]);
    setMyTemplatesFetched(true);
    showToast(`"${tpl.name}" saved to My Templates`);
  };

  // Delete a saved template
  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await authFetch(`/api/script-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMyTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted');
    } catch {
      showToast('Failed to delete template', 'error');
    }
  };

  // Duplicate a saved template
  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await authFetch(`/api/script-templates/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Duplicate failed');
      const dup: SavedTemplate = await res.json();
      setMyTemplates(prev => [dup, ...prev]);
      showToast(`Duplicated as "${dup.name}"`);
    } catch {
      showToast('Failed to duplicate template', 'error');
    }
  };

  return (
    <FadeIn className="flex flex-col h-full bg-background">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[300] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <FadeIn key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-auto ${t.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>
            {t.message}
          </FadeIn>
        ))}
      </div>

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

          {/* Tabs */}
          <div className="flex gap-1 bg-surface/50 border border-white/5 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'gallery' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-textMain hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-2">
                <Robot size={15} />
                Template Gallery
                <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{RE_SCRIPT_TEMPLATES.length}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'mine' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-textMain hover:bg-white/5'}`}
            >
              <span className="flex items-center gap-2">
                <BookBookmark size={15} />
                My Templates
                {myTemplatesFetched && myTemplates.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{myTemplates.length}</span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Gallery search/filters (only shown on gallery tab) */}
        {activeTab === 'gallery' && (
          <>
            <div className="px-6 pb-3">
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
                <div className="flex items-center gap-1 bg-surface/50 border border-white/5 rounded-xl p-1">
                  {['all', 'outbound', 'inbound'].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setSelectedDirection(dir as typeof selectedDirection)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${selectedDirection === dir ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-textMain hover:bg-white/5'}`}
                    >
                      {dir === 'all' ? 'All' : dir === 'inbound' ? 'Inbound' : 'Outbound'}
                    </button>
                  ))}
                </div>
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
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all ${selectedCategory === 'all' ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20' : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'}`}
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
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${selectedCategory === category.id ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20' : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'}`}
                    >
                      <Icon size={16} weight={selectedCategory === category.id ? 'fill' : 'regular'} className={category.color} />
                      {category.name}
                      <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'gallery' && (
          filteredTemplates.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlass size={32} className="text-textMuted" />
              </div>
              <h3 className="text-lg font-medium text-textMain mb-2">No templates found</h3>
              <p className="text-sm text-textMuted">Try adjusting your search or filters</p>
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
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 ${categoryInfo?.color}`}>
                        <Icon size={14} weight="fill" />
                        <span className="text-xs font-medium">{categoryInfo?.name}</span>
                      </div>
                      <Badge variant={template.direction === 'inbound' ? 'success' : 'default'} size="sm">
                        {template.direction === 'inbound' ? (
                          <><PhoneIncoming size={12} />Inbound</>
                        ) : (
                          <><Phone size={12} />Outbound</>
                        )}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-textMain mb-2 group-hover:text-primary transition-colors">{template.name}</h3>
                    <p className="text-sm text-textMuted mb-4 line-clamp-2">{template.description}</p>
                    <div className="flex items-center gap-4 mb-4 text-xs text-textMuted">
                      <span className="flex items-center gap-1"><Tag size={12} />{template.variables.length} variables</span>
                      <span className="flex items-center gap-1"><Clock size={12} />~{template.estimatedCallDuration} min</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">{tag}</span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/5 text-textMuted text-xs rounded">+{template.tags.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setPreviewScript(template); }}
                      >
                        <Eye size={14} />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSaveModalScript(template); }}
                      >
                        <FloppyDisk size={14} weight="fill" />
                        Save
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleApplyTemplate(template); }}
                      >
                        <Lightning size={14} weight="fill" />
                        Use
                      </Button>
                    </div>
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowSquareOut size={20} className="text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'mine' && (
          <MyTemplatesTab
            templates={myTemplates}
            loading={myTemplatesLoading}
            onDelete={handleDeleteTemplate}
            onDuplicate={handleDuplicateTemplate}
            onApplyToAssistant={handleApplySavedTemplate}
            onCreateNew={() => navigate('/assistants/new')}
          />
        )}
      </div>

      {/* Preview Modal */}
      {previewScript && (
        <ScriptPreviewModal
          script={previewScript}
          onClose={() => setPreviewScript(null)}
          onApply={(s) => { setPreviewScript(null); handleApplyTemplate(s); }}
          onSave={(s) => { setPreviewScript(null); setSaveModalScript(s); }}
        />
      )}

      {/* Save Modal */}
      {saveModalScript && (
        <SaveModal
          script={saveModalScript}
          onClose={() => setSaveModalScript(null)}
          onSaved={handleSaveTemplate}
        />
      )}
    </FadeIn>
  );
};

export default ScriptTemplates;
