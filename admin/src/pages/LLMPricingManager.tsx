import React, { useState, useEffect } from 'react';
import {
    Brain,
    PencilSimple,
    ArrowsClockwise,
    CurrencyDollar,
    ToggleRight,
    ToggleLeft,
    Lightning,
    Clock,
    Database,
    TrendUp,
    CheckCircle,
    Warning
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Input, Toggle } from '../components/ui';
import type { LLMPricing } from '../types/admin.types';

const LLMPricingManager: React.FC = () => {
    const [models, setModels] = useState<LLMPricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedModel, setSelectedModel] = useState<LLMPricing | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        display_name: '',
        description: '',
        context_window: '128K',
        speed: 'Medium',
        provider_input_cost_per_million: 0,
        provider_output_cost_per_million: 0,
        callyy_input_cost_per_million: 0,
        callyy_output_cost_per_million: 0,
        is_active: true,
    });

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('llm_pricing')
                .select('*')
                .order('provider', { ascending: true });

            if (error) throw error;

            // Calculate margin for each model
            const modelsWithMargin = data?.map(m => {
                const providerCost = Number(m.provider_input_cost_per_million) + Number(m.provider_output_cost_per_million);
                const callyyPrice = Number(m.callyy_input_cost_per_million) + Number(m.callyy_output_cost_per_million);
                const margin = providerCost > 0 ? ((callyyPrice - providerCost) / providerCost) * 100 : 0;
                return {
                    ...m,
                    margin_percent: Math.round(margin),
                };
            }) || [];

            setModels(modelsWithMargin);
        } catch (error) {
            console.error('Error fetching LLM pricing:', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (model: LLMPricing) => {
        setSelectedModel(model);
        setEditForm({
            display_name: model.display_name,
            description: model.description || '',
            context_window: model.context_window,
            speed: model.speed,
            provider_input_cost_per_million: model.provider_input_cost_per_million,
            provider_output_cost_per_million: model.provider_output_cost_per_million,
            callyy_input_cost_per_million: model.callyy_input_cost_per_million,
            callyy_output_cost_per_million: model.callyy_output_cost_per_million,
            is_active: model.is_active,
        });
        setShowEditModal(true);
    };

    const saveModel = async () => {
        if (!selectedModel) return;

        try {
            const { error } = await supabase
                .from('llm_pricing')
                .update({
                    display_name: editForm.display_name,
                    description: editForm.description,
                    context_window: editForm.context_window,
                    speed: editForm.speed,
                    provider_input_cost_per_million: editForm.provider_input_cost_per_million,
                    provider_output_cost_per_million: editForm.provider_output_cost_per_million,
                    callyy_input_cost_per_million: editForm.callyy_input_cost_per_million,
                    callyy_output_cost_per_million: editForm.callyy_output_cost_per_million,
                    is_active: editForm.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedModel.id);

            if (error) throw error;

            setSuccess('Model pricing updated successfully');
            setShowEditModal(false);
            fetchModels();
        } catch (err) {
            console.error('Error saving model:', err);
            setError('Failed to update pricing');
        }
    };

    const toggleModelActive = async (modelId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('llm_pricing')
                .update({ is_active: !currentStatus })
                .eq('id', modelId);

            if (error) throw error;
            fetchModels();
        } catch (error) {
            console.error('Error toggling model:', error);
        }
    };

    const getProviderColor = (provider: string) => {
        const colors: Record<string, string> = {
            openai: 'text-emerald-400',
            anthropic: 'text-amber-400',
            groq: 'text-rose-400',
            together: 'text-blue-400',
        };
        return colors[provider.toLowerCase()] || 'text-textMain';
    };

    const formatCost = (cost: number) => `$${cost.toFixed(2)}`;

    // Clear messages after delay
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const columns = [
        {
            key: 'display_name',
            header: 'Model',
            sortable: true,
            render: (value: string, row: LLMPricing) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Brain size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-textMain">{value}</p>
                        <p className={`text-xs ${getProviderColor(row.provider)} capitalize`}>{row.provider}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'model',
            header: 'Model ID',
            render: (value: string) => (
                <code className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded">{value}</code>
            ),
        },
        {
            key: 'context_window',
            header: 'Context',
            render: (value: string) => (
                <div className="flex items-center gap-1">
                    <Database size={14} className="text-textMuted" />
                    <span className="text-textMain">{value}</span>
                </div>
            ),
        },
        {
            key: 'speed',
            header: 'Speed',
            render: (value: string) => (
                <Badge variant={value === 'Fast' ? 'success' : value === 'Medium' ? 'warning' : 'default'}>
                    <Lightning size={12} /> {value}
                </Badge>
            ),
        },
        {
            key: 'callyy_input_cost_per_million',
            header: 'Input Cost',
            sortable: true,
            render: (value: number) => (
                <span className="text-emerald-400 font-medium">{formatCost(value)}/M</span>
            ),
        },
        {
            key: 'callyy_output_cost_per_million',
            header: 'Output Cost',
            sortable: true,
            render: (value: number) => (
                <span className="text-amber-400 font-medium">{formatCost(value)}/M</span>
            ),
        },
        {
            key: 'margin_percent',
            header: 'Margin',
            sortable: true,
            render: (value: number) => (
                <span className={`font-medium ${value >= 30 ? 'text-emerald-400' : value >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {value}%
                </span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (value: boolean, row: LLMPricing) => (
                <button
                    onClick={() => toggleModelActive(row.id, value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        value 
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-surface text-textMuted hover:bg-white/10'
                    }`}
                >
                    {value ? <ToggleRight size={16} weight="fill" /> : <ToggleLeft size={16} />}
                    {value ? 'Active' : 'Inactive'}
                </button>
            ),
        },
        {
            key: 'actions',
            header: 'Edit',
            width: '60px',
            render: (_: any, row: LLMPricing) => (
                <button
                    onClick={() => openEditModal(row)}
                    className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit Pricing"
                >
                    <PencilSimple size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                        <Brain size={28} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">LLM Pricing Manager</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage pricing for {models.length} LLM models
                        </p>
                    </div>
                </div>
                <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchModels}>
                    Refresh
                </Button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <Warning size={18} />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Total Models"
                    value={models.length.toString()}
                    icon={<Brain size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="Active"
                    value={models.filter(m => m.is_active).length.toString()}
                    icon={<ToggleRight size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Avg Margin"
                    value={`${Math.round(models.reduce((sum, m) => sum + (m.margin_percent || 0), 0) / models.length)}%`}
                    icon={<TrendUp size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
                <StatsCard
                    title="Providers"
                    value={new Set(models.map(m => m.provider)).size.toString()}
                    icon={<Database size={20} weight="bold" />}
                    color="violet"
                    loading={loading}
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={models}
                loading={loading}
                rowKey="id"
                emptyMessage="No LLM models found"
                emptyIcon={<Brain size={32} className="text-textMuted/50" />}
            />

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Model Pricing"
                subtitle={selectedModel?.model}
                icon={<Brain size={24} className="text-primary" />}
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveModel}>
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Display Name"
                            value={editForm.display_name}
                            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        />
                        <Input
                            label="Context Window"
                            value={editForm.context_window}
                            onChange={(e) => setEditForm({ ...editForm, context_window: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />

                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="text-sm font-medium text-textMain mb-4">Provider Cost (per million tokens)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Input Cost ($)"
                                type="number"
                                step="0.01"
                                value={editForm.provider_input_cost_per_million}
                                onChange={(e) => setEditForm({ ...editForm, provider_input_cost_per_million: Number(e.target.value) })}
                            />
                            <Input
                                label="Output Cost ($)"
                                type="number"
                                step="0.01"
                                value={editForm.provider_output_cost_per_million}
                                onChange={(e) => setEditForm({ ...editForm, provider_output_cost_per_million: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                        <h4 className="text-sm font-medium text-primary mb-4">Your Price (per million tokens)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Input Cost ($)"
                                type="number"
                                step="0.01"
                                value={editForm.callyy_input_cost_per_million}
                                onChange={(e) => setEditForm({ ...editForm, callyy_input_cost_per_million: Number(e.target.value) })}
                            />
                            <Input
                                label="Output Cost ($)"
                                type="number"
                                step="0.01"
                                value={editForm.callyy_output_cost_per_million}
                                onChange={(e) => setEditForm({ ...editForm, callyy_output_cost_per_million: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Margin Calculator */}
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-xs text-emerald-400 mb-1">Calculated Margin</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {(() => {
                                const providerCost = editForm.provider_input_cost_per_million + editForm.provider_output_cost_per_million;
                                const yourPrice = editForm.callyy_input_cost_per_million + editForm.callyy_output_cost_per_million;
                                const margin = providerCost > 0 ? ((yourPrice - providerCost) / providerCost) * 100 : 0;
                                return `${Math.round(margin)}%`;
                            })()}
                        </p>
                    </div>

                    <Toggle
                        checked={editForm.is_active}
                        onChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                        label="Model Active"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default LLMPricingManager;
