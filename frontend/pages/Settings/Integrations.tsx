import { MagnifyingGlass, CaretDown, CaretUp, Sparkle, Lightning, Microphone, Robot, Database, Cloud, ChartLine, Phone, Plug, Plugs, CircleNotch } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';

import { CRMConfigModal, CRMIntegrationCard } from '@/components/crm';
import {
  getIntegrations,
  CRM_PROVIDERS_LIST,
  type CRMIntegration,
  type CRMProvider,
} from '@/services/crmService';
import { logger } from '@/lib/logger';

interface Provider {
    name: string;
    description: string;
    icon: string; // In a real app, this might be a component or image URL
    isNew?: boolean;
    isDeprecated?: boolean;
}

interface Category {
    title: string;
    providers: Provider[];
}

const ProviderCard: React.FC<{ provider: Provider }> = ({ provider }) => (
    <div className="group bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 hover:border-primary/30 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer h-full flex flex-col">
        <div className="mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center text-xl font-bold text-primary border border-white/10 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                {provider.icon ? <img src={provider.icon} alt={provider.name} className="w-6 h-6" /> : provider.name[0]}
            </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-textMain group-hover:text-primary transition-colors">{provider.name}</h3>
            {provider.isDeprecated && (
                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/20">Deprecated</span>
            )}
        </div>
        <p className="text-xs text-textMuted/80 leading-relaxed flex-1">
            {provider.description}
        </p>
        <div className="mt-4 pt-3 border-t border-white/5">
            <span className="text-[10px] text-primary/60 font-medium uppercase tracking-wider group-hover:text-primary transition-colors">
                Configure →
            </span>
        </div>
    </div>
);

const CategorySection: React.FC<{ category: Category; icon: React.ElementType }> = ({ category, icon: Icon }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mb-8">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="group flex items-center gap-3 mb-5 w-full hover:opacity-80 transition-opacity"
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                    <Icon size={16} weight="duotone" className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-textMain">{category.title}</h3>
                <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    {category.providers.length}
                </span>
                <div className="ml-auto">
                    {isExpanded ? (
                        <CaretUp size={18} weight="bold" className="text-textMuted" />
                    ) : (
                        <CaretDown size={18} weight="bold" className="text-textMuted" />
                    )}
                </div>
            </button>
            
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-11">
                    {category.providers.map((provider) => (
                        <ProviderCard key={provider.name} provider={provider} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Integrations: React.FC = () => {
    // CRM integrations state
    const [crmIntegrations, setCrmIntegrations] = useState<CRMIntegration[]>([]);
    const [crmLoading, setCrmLoading] = useState(true);
    const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(null);
    const [selectedIntegration, setSelectedIntegration] = useState<CRMIntegration | undefined>(undefined);
    const [showCrmModal, setShowCrmModal] = useState(false);

    // Load CRM integrations
    useEffect(() => {
        loadCrmIntegrations();
    }, []);

    const loadCrmIntegrations = async () => {
        setCrmLoading(true);
        try {
            const integrations = await getIntegrations();
            setCrmIntegrations(integrations);
        } catch (err) {
            logger.error('Failed to load CRM integrations', { error: err });
        } finally {
            setCrmLoading(false);
        }
    };

    const handleConnectCRM = (providerId: CRMProvider) => {
        setSelectedProvider(providerId);
        setSelectedIntegration(undefined);
        setShowCrmModal(true);
    };

    const handleConfigureCRM = (integration: CRMIntegration) => {
        setSelectedProvider(integration.provider);
        setSelectedIntegration(integration);
        setShowCrmModal(true);
    };

    const handleCRMSuccess = (integration: CRMIntegration) => {
        setCrmIntegrations(prev => {
            const existing = prev.findIndex(i => i.id === integration.id);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = integration;
                return updated;
            }
            return [...prev, integration];
        });
        setShowCrmModal(false);
    };

    const handleCRMDelete = () => {
        if (selectedIntegration) {
            setCrmIntegrations(prev => prev.filter(i => i.id !== selectedIntegration.id));
        }
        setShowCrmModal(false);
    };

    const categories: Category[] = [
        {
            title: "Voice Providers",
            providers: [
                { name: "ElevenLabs", description: "AI voice cloning and generation with natural speech synthesis.", icon: "" },
                { name: "Cartesia", description: "Lightning-fast text-to-speech with ultra-low latency.", icon: "" },
                { name: "Deepgram", description: "Real-time speech recognition with low latency for production use.", icon: "" },
                { name: "Azure Speech", description: "Enterprise text-to-speech and speech-to-text by Microsoft.", icon: "" },
                { name: "Inworld", description: "AI voices designed for interactive character experiences.", icon: "" },
                { name: "RimeAI", description: "Realistic text-to-speech with emotional voice control.", icon: "" },
                { name: "SmallestAI", description: "Ultra-fast, low-latency voice synthesis for real-time applications.", icon: "" },
                { name: "Neuphonic", description: "Natural-sounding text-to-speech with emotional AI.", icon: "" },
                { name: "Hume", description: "Emotionally intelligent AI voices with expressive speech.", icon: "" },
                { name: "LMNT", description: "Real-time AI voice synthesis optimized for conversational AI.", icon: "" },
                { name: "Minimax", description: "Advanced text-to-speech with multilingual voice support.", icon: "" },
                { name: "PlayHT", description: "High-quality AI voice generation with custom voice cloning.", isDeprecated: true, icon: "" },
            ]
        },
        {
            title: "Model Providers",
            providers: [
                { name: "OpenAI", description: "State-of-the-art GPT and o-series models", icon: "" },
                { name: "Anthropic", description: "Claude series models focused on safe, helpful AI.", icon: "" },
                { name: "Google", description: "Gemini series models for rich AI understanding.", icon: "" },
                { name: "Azure OpenAI", description: "Azure-hosted OpenAI models with enterprise governance.", icon: "" },
                { name: "Inflection AI", description: "Inflection conversational models tuned for empathetic dialogue.", icon: "" },
                { name: "Cerebras", description: "High performance inference platform.", icon: "" },
                { name: "xAI", description: "Grok series models with real-time knowledge access.", icon: "" },
                { name: "Mistral", description: "Mistral family of efficient open-source models.", icon: "" },
                { name: "Together AI", description: "Hosted open-source LLMs served through Together AI.", icon: "" },
                { name: "Anyscale", description: "Anyscale platform for scalable open-source LLM hosting.", icon: "" },
                { name: "OpenRouter", description: "Unified API to many community LLMs via OpenRouter.", icon: "" },
                { name: "Perplexity AI", description: "Perplexity AI models tuned for informed responses.", icon: "" },
                { name: "DeepInfra", description: "DeepInfra managed inference for popular open models.", icon: "" },
                { name: "Custom LLM", description: "Connect your own custom language model endpoint.", icon: "" },
            ]
        },
        {
            title: "Transcriber Providers",
            providers: [
                { name: "Deepgram", description: "Real-time speech recognition with low latency.", icon: "" },
                { name: "AssemblyAI", description: "Accurate speech-to-text API with audio intelligence.", icon: "" },
            ]
        },
        {
            title: "Tool Providers",
            providers: [
                { name: "Make", description: "Automate workflows with Make.com integration webhooks.", icon: "" },
                { name: "GoHighLevel", description: "CRM and marketing automation platform integration.", icon: "" },
                { name: "Slack", description: "Send messages and notifications to Slack channels.", icon: "" },
                { name: "Google Calendar", description: "Manage calendar events and schedule appointments.", icon: "" },
                { name: "Google Sheets", description: "Read and write data to Google Sheets spreadsheets.", icon: "" },
                { name: "GoHighLevel MCP", description: "Advanced GoHighLevel integration with MCP protocol.", icon: "" },
            ]
        },
        {
            title: "Vector Store Providers",
            providers: [
                { name: "Trieve", description: "Vector search and semantic retrieval for AI applications.", isDeprecated: true, icon: "" },
            ]
        },
        {
            title: "Phone Number Providers",
            providers: [
                { name: "SIP Trunk", description: "Bring your own SIP trunk or carrier for phone connectivity.", icon: "" },
                { name: "Telnyx", description: "Global phone numbers with reliable voice infrastructure.", icon: "" },
                { name: "Vonage", description: "International phone numbers and communications API.", icon: "" },
            ]
        },
        {
            title: "Cloud Providers",
            providers: [
                { name: "AWS S3", description: "Scalable cloud storage for recordings and artifacts.", icon: "" },
                { name: "Azure Blob Storage", description: "Enterprise cloud storage by Microsoft Azure.", icon: "" },
                { name: "Google Cloud Storage", description: "Reliable object storage with global edge network.", icon: "" },
                { name: "Cloudflare R2", description: "Zero-egress cloud storage with global distribution.", icon: "" },
                { name: "Supabase", description: "Open-source cloud storage with built-in authentication.", icon: "" },
            ]
        },
        {
            title: "Observability Providers",
            providers: [
                { name: "Langfuse", description: "LLM observability, tracing, and analytics platform.", icon: "" },
            ]
        }
    ];

    // Map category titles to icons
    const categoryIcons: Record<string, React.ElementType> = {
        "Voice Providers": Microphone,
        "Model Providers": Robot,
        "Transcriber Providers": Microphone,
        "Tool Providers": Plug,
        "Vector Store Providers": Database,
        "Phone Number Providers": Phone,
        "Cloud Providers": Cloud,
        "Observability Providers": ChartLine,
    };

    return (
        <div className="max-w-7xl mx-auto mb-20">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                        <Plug size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Integrations</h1>
                        <p className="text-sm text-textMuted">Connect your favorite tools and services</p>
                    </div>
                </div>
                
                <div className="relative w-72">
                    <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input 
                        type="text" 
                        placeholder="Search integrations..." 
                        className="w-full bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50 transition-all"
                    />
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 mb-8 p-4 bg-surface/30 rounded-2xl border border-white/[0.04]">
                <div className="flex items-center gap-2">
                    <Lightning size={16} weight="fill" className="text-primary" />
                    <span className="text-sm text-textMuted">
                        <span className="font-semibold text-textMain">{categories.reduce((acc, cat) => acc + cat.providers.length, 0)}</span> integrations available
                    </span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                    <Sparkle size={16} weight="fill" className="text-violet-400" />
                    <span className="text-sm text-textMuted">
                        <span className="font-semibold text-textMain">{categories.length}</span> categories
                    </span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                    <Plugs size={16} weight="fill" className="text-green-400" />
                    <span className="text-sm text-textMuted">
                        <span className="font-semibold text-textMain">{crmIntegrations.filter(i => i.isConnected).length}</span> CRMs connected
                    </span>
                </div>
            </div>

            {/* CRM Integrations Section */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                        <Plugs size={16} weight="duotone" className="text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-textMain">CRM Integrations</h3>
                    <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                        {CRM_PROVIDERS_LIST.length} available
                    </span>
                </div>
                
                {crmLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <CircleNotch size={24} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-11">
                        {CRM_PROVIDERS_LIST.map((provider) => {
                            const integration = crmIntegrations.find(i => i.provider === provider.id);
                            return (
                                <CRMIntegrationCard
                                    key={provider.id}
                                    provider={provider}
                                    integration={integration}
                                    onConnect={() => handleConnectCRM(provider.id)}
                                    onConfigure={() => integration && handleConfigureCRM(integration)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 my-8" />

            <div className="space-y-2">
                {categories.map((category) => (
                    <CategorySection 
                        key={category.title} 
                        category={category} 
                        icon={categoryIcons[category.title] || Plug}
                    />
                ))}
            </div>

            {/* CRM Config Modal */}
            {selectedProvider && (
                <CRMConfigModal
                    isOpen={showCrmModal}
                    provider={selectedProvider}
                    existingIntegration={selectedIntegration}
                    onClose={() => setShowCrmModal(false)}
                    onSuccess={handleCRMSuccess}
                    onDelete={handleCRMDelete}
                />
            )}
        </div>
    );
};

export default Integrations;
