import React, { useState, useEffect } from 'react';
import {
    CurrencyDollar,
    Brain,
    Microphone,
    Waveform,
    Phone,
    WhatsappLogo,
    HardDrives,
    CreditCard,
    PencilSimple,
    ArrowsClockwise,
    ToggleRight,
    ToggleLeft,
    TrendUp,
    CheckCircle,
    Warning,
    FunnelSimple,
    MagnifyingGlass,
    Plus
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { DataTable, StatsCard, Badge, Button, Modal, Input, Toggle, Select, Tabs } from '../components/ui';

interface ServiceCategory {
    id: string;
    name: string;
    display_name: string;
    icon: string;
    description: string;
}

interface ServicePricing {
    id: string;
    category_id: string;
    category_name?: string;
    category_display_name?: string;
    service_code: string;
    service_name: string;
    description: string;
    provider: string;
    provider_model: string;
    cost_unit: string;
    cost_currency: string;
    provider_cost: number;
    selling_price_usd: number;
    margin_percent: number;
    profit_per_unit_usd: number;
    pricing_tier: string;
    is_active: boolean;
    tags: string[];
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

const ServicePricingManager: React.FC = () => {
    const [services, setServices] = useState<ServicePricing[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedService, setSelectedService] = useState<ServicePricing | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Edit form state
    const [editForm, setEditForm] = useState({
        service_name: '',
        description: '',
        provider: '',
        provider_model: '',
        cost_unit: '',
        provider_cost: 0,
        selling_price_usd: 0,
        pricing_tier: 'standard',
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch categories
            const { data: categoriesData, error: catError } = await supabase
                .from('service_categories')
                .select('*')
                .order('display_name');

            if (catError) throw catError;
            setCategories(categoriesData || []);

            // Fetch all services with their categories
            const { data: servicesData, error: svcError } = await supabase
                .from('service_pricing')
                .select(`
                    *,
                    service_categories!service_pricing_category_id_fkey (
                        name,
                        display_name
                    )
                `)
                .order('service_name');

            if (svcError) throw svcError;

            const servicesWithCategory = servicesData?.map(s => ({
                ...s,
                category_name: s.service_categories?.name || 'unknown',
                category_display_name: s.service_categories?.display_name || 'Unknown',
            })) || [];

            setServices(servicesWithCategory);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch pricing data');
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (service: ServicePricing) => {
        setSelectedService(service);
        setEditForm({
            service_name: service.service_name,
            description: service.description || '',
            provider: service.provider,
            provider_model: service.provider_model || '',
            cost_unit: service.cost_unit,
            provider_cost: service.provider_cost,
            selling_price_usd: service.selling_price_usd,
            pricing_tier: service.pricing_tier,
            is_active: service.is_active,
        });
        setShowEditModal(true);
    };

    const saveService = async () => {
        if (!selectedService) return;

        try {
            const { error } = await supabase
                .from('service_pricing')
                .update({
                    service_name: editForm.service_name,
                    description: editForm.description,
                    provider: editForm.provider,
                    provider_model: editForm.provider_model,
                    cost_unit: editForm.cost_unit,
                    provider_cost: editForm.provider_cost,
                    selling_price_usd: editForm.selling_price_usd,
                    pricing_tier: editForm.pricing_tier,
                    is_active: editForm.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedService.id);

            if (error) throw error;

            setSuccess('Pricing updated successfully');
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            console.error('Error saving service:', err);
            setError('Failed to update pricing');
        }
    };

    const toggleServiceActive = async (serviceId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('service_pricing')
                .update({ is_active: !currentStatus })
                .eq('id', serviceId);

            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error toggling service:', err);
        }
    };

    const getCategoryIcon = (categoryName: string) => {
        const icons: Record<string, React.ReactNode> = {
            llm: <Brain size={18} className="text-emerald-400" />,
            tts: <Microphone size={18} className="text-violet-400" />,
            stt: <Waveform size={18} className="text-amber-400" />,
            telephony: <Phone size={18} className="text-blue-400" />,
            whatsapp: <WhatsappLogo size={18} className="text-green-400" />,
            infrastructure: <HardDrives size={18} className="text-rose-400" />,
            payments: <CreditCard size={18} className="text-primary" />,
        };
        return icons[categoryName] || <CurrencyDollar size={18} className="text-textMuted" />;
    };

    const getTierBadge = (tier: string) => {
        const variants: Record<string, 'success' | 'warning' | 'primary' | 'default'> = {
            economy: 'default',
            standard: 'primary',
            premium: 'warning',
        };
        return <Badge variant={variants[tier] || 'default'}>{tier}</Badge>;
    };

    const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
    const formatMargin = (margin: number) => `${margin.toFixed(1)}%`;

    // Filter services
    const filteredServices = services.filter(s => {
        const matchesCategory = activeCategory === 'all' || s.category_name === activeCategory;
        const matchesSearch = s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.service_code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Calculate stats
    const activeServices = services.filter(s => s.is_active).length;
    const avgMargin = services.length > 0
        ? services.reduce((sum, s) => sum + (s.margin_percent || 0), 0) / services.length
        : 0;
    const lowMarginServices = services.filter(s => s.margin_percent > 0 && s.margin_percent < 100).length;

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

    const categoryTabs = [
        { id: 'all', label: 'All Services', icon: <FunnelSimple size={18} /> },
        ...categories.map(c => ({
            id: c.name,
            label: c.display_name,
            icon: getCategoryIcon(c.name),
        })),
    ];

    const columns = [
        {
            key: 'service_name',
            header: 'Service',
            sortable: true,
            render: (value: string, row: ServicePricing) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        {getCategoryIcon(row.category_name || '')}
                    </div>
                    <div>
                        <p className="font-medium text-textMain">{value}</p>
                        <p className="text-xs text-textMuted">{row.provider} • {row.provider_model || row.service_code}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'category_display_name',
            header: 'Category',
            sortable: true,
            render: (value: string) => (
                <span className="text-textMuted">{value}</span>
            ),
        },
        {
            key: 'cost_unit',
            header: 'Unit',
            render: (value: string) => (
                <code className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded">
                    {value?.replace('per_', '/').replace('_', ' ')}
                </code>
            ),
        },
        {
            key: 'provider_cost',
            header: 'Provider Cost',
            sortable: true,
            render: (value: number) => (
                <span className="text-rose-400 font-mono">{formatCost(value)}</span>
            ),
        },
        {
            key: 'selling_price_usd',
            header: 'Selling Price',
            sortable: true,
            render: (value: number) => (
                <span className="text-emerald-400 font-medium font-mono">{formatCost(value)}</span>
            ),
        },
        {
            key: 'margin_percent',
            header: 'Margin',
            sortable: true,
            render: (value: number) => (
                <span className={`font-medium ${
                    value >= 150 ? 'text-emerald-400' : 
                    value >= 100 ? 'text-amber-400' : 
                    value > 0 ? 'text-rose-400' : 'text-textMuted'
                }`}>
                    {value > 0 ? formatMargin(value) : 'N/A'}
                </span>
            ),
        },
        {
            key: 'pricing_tier',
            header: 'Tier',
            render: (value: string) => getTierBadge(value),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (value: boolean, row: ServicePricing) => (
                <button
                    onClick={() => toggleServiceActive(row.id, value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        value
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-surface text-textMuted hover:bg-white/10'
                    }`}
                >
                    {value ? <ToggleRight size={16} weight="fill" /> : <ToggleLeft size={16} />}
                    {value ? 'Active' : 'Off'}
                </button>
            ),
        },
        {
            key: 'actions',
            header: 'Edit',
            width: '60px',
            render: (_: unknown, row: ServicePricing) => (
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
                        <CurrencyDollar size={28} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Service Pricing</h1>
                        <p className="text-textMuted text-sm mt-0.5">
                            Manage costs and selling prices for {services.length} services
                        </p>
                    </div>
                </div>
                <Button variant="secondary" icon={<ArrowsClockwise size={18} />} onClick={fetchData}>
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
                    title="Total Services"
                    value={services.length.toString()}
                    icon={<CurrencyDollar size={20} weight="bold" />}
                    color="primary"
                    loading={loading}
                />
                <StatsCard
                    title="Active"
                    value={activeServices.toString()}
                    icon={<ToggleRight size={20} weight="bold" />}
                    color="emerald"
                    loading={loading}
                />
                <StatsCard
                    title="Avg Margin"
                    value={`${avgMargin.toFixed(0)}%`}
                    icon={<TrendUp size={20} weight="bold" />}
                    color="amber"
                    loading={loading}
                />
                <StatsCard
                    title="Low Margin (<100%)"
                    value={lowMarginServices.toString()}
                    icon={<Warning size={20} weight="bold" />}
                    color="rose"
                    loading={loading}
                />
            </div>

            {/* Category Tabs */}
            <Tabs
                tabs={categoryTabs}
                activeTab={activeCategory}
                onChange={setActiveCategory}
            />

            {/* Search */}
            <div className="relative max-w-md">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                    type="text"
                    placeholder="Search services, providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-white/10 rounded-xl text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm"
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredServices}
                loading={loading}
                rowKey="id"
                emptyMessage="No services found"
                emptyIcon={<CurrencyDollar size={32} className="text-textMuted/50" />}
            />

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Service Pricing"
                subtitle={selectedService?.service_code}
                icon={<CurrencyDollar size={24} className="text-primary" />}
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveService}>
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Service Name"
                            value={editForm.service_name}
                            onChange={(e) => setEditForm({ ...editForm, service_name: e.target.value })}
                        />
                        <Input
                            label="Provider"
                            value={editForm.provider}
                            onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Provider Model"
                            value={editForm.provider_model}
                            onChange={(e) => setEditForm({ ...editForm, provider_model: e.target.value })}
                        />
                        <Input
                            label="Cost Unit"
                            value={editForm.cost_unit}
                            onChange={(e) => setEditForm({ ...editForm, cost_unit: e.target.value })}
                        />
                    </div>

                    <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <h4 className="text-sm font-medium text-rose-400 mb-4">Provider Cost (what you pay)</h4>
                        <Input
                            label="Cost ($)"
                            type="number"
                            step="0.0001"
                            value={editForm.provider_cost}
                            onChange={(e) => setEditForm({ ...editForm, provider_cost: Number(e.target.value) })}
                        />
                    </div>

                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <h4 className="text-sm font-medium text-emerald-400 mb-4">Selling Price (what customers pay)</h4>
                        <Input
                            label="Price ($)"
                            type="number"
                            step="0.0001"
                            value={editForm.selling_price_usd}
                            onChange={(e) => setEditForm({ ...editForm, selling_price_usd: Number(e.target.value) })}
                        />
                    </div>

                    {/* Margin Calculator */}
                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                        <p className="text-xs text-primary mb-1">Calculated Margin</p>
                        <p className="text-2xl font-bold text-primary">
                            {(() => {
                                const margin = editForm.provider_cost > 0
                                    ? ((editForm.selling_price_usd - editForm.provider_cost) / editForm.provider_cost) * 100
                                    : 0;
                                return `${margin.toFixed(1)}%`;
                            })()}
                        </p>
                        <p className="text-xs text-textMuted mt-1">
                            Profit: ${(editForm.selling_price_usd - editForm.provider_cost).toFixed(4)} per unit
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Pricing Tier"
                            value={editForm.pricing_tier}
                            onChange={(e) => setEditForm({ ...editForm, pricing_tier: e.target.value })}
                            options={[
                                { value: 'economy', label: 'Economy' },
                                { value: 'standard', label: 'Standard' },
                                { value: 'premium', label: 'Premium' },
                            ]}
                        />
                        <div className="flex items-end">
                            <Toggle
                                checked={editForm.is_active}
                                onChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                                label="Service Active"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ServicePricingManager;
