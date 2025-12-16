import { X, Check, Sparkle, CurrencyDollar } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { getLLMPricing, LLMPricing, getCostPer1KTokens } from '../../services/billingService';

interface LLMProvider {
    id: string;
    name: string;
    models: string[];
}

interface LLMSelectorModalProps {
    providers: LLMProvider[];
    selectedProvider: string;
    selectedModel: string;
    onSelect: (provider: string, model: string) => void;
    onClose: () => void;
}

// Provider icons and colors
const PROVIDER_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    openai: { icon: Sparkle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

// Fallback model descriptions (will be overridden by DB data)
const MODEL_INFO: Record<string, { description: string; context: string; speed: string }> = {
    'gpt-4o': { description: 'Most capable model, best for complex tasks', context: '128K', speed: 'Medium' },
    'gpt-4o-mini': { description: 'Smaller, faster, cheaper than GPT-4o', context: '128K', speed: 'Fast' },
    'gpt-4-turbo': { description: 'Previous generation, still powerful', context: '128K', speed: 'Medium' },
    'gpt-3.5-turbo': { description: 'Fast and cost-effective', context: '16K', speed: 'Very Fast' },
};

const LLMSelectorModal: React.FC<LLMSelectorModalProps> = ({
    providers,
    selectedProvider,
    selectedModel,
    onSelect,
    onClose,
}) => {
    const [tempProvider, setTempProvider] = useState(selectedProvider);
    const [tempModel, setTempModel] = useState(selectedModel);
    const [pricingData, setPricingData] = useState<Map<string, LLMPricing>>(new Map());
    const [loadingPricing, setLoadingPricing] = useState(true);

    // Fetch pricing data on mount
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const pricing = await getLLMPricing();
                const pricingMap = new Map<string, LLMPricing>();
                pricing.forEach(p => pricingMap.set(p.model, p));
                setPricingData(pricingMap);
            } catch (error) {
                console.error('Error fetching pricing:', error);
            } finally {
                setLoadingPricing(false);
            }
        };
        fetchPricing();
    }, []);

    // Get current provider's models
    const currentProvider = providers.find(p => p.id === tempProvider);
    const providerConfig = PROVIDER_CONFIG[tempProvider] || { icon: Cpu, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    const Icon = providerConfig.icon;

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleConfirm = () => {
        onSelect(tempProvider, tempModel);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-semibold text-textMain">Select LLM</h2>
                        <p className="text-sm text-textMuted mt-1">Choose the language model for your agent</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-surfaceHover rounded-lg text-textMuted hover:text-textMain transition-colors"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Provider Selection */}
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-sm font-medium text-textMain mb-3">Provider</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {providers.map((provider) => {
                            const config = PROVIDER_CONFIG[provider.id] || { icon: Cpu, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
                            const ProviderIcon = config.icon;
                            const isSelected = tempProvider === provider.id;
                            
                            return (
                                <button
                                    key={provider.id}
                                    onClick={() => {
                                        setTempProvider(provider.id);
                                        // Auto-select first model of provider
                                        setTempModel(provider.models[0]);
                                    }}
                                    className={`
                                        relative p-3 rounded-xl border transition-all
                                        ${isSelected 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-border hover:border-primary/50 bg-surface'
                                        }
                                    `}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <Check size={12} weight="bold" className="text-primary" />
                                        </div>
                                    )}
                                    <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center mb-2`}>
                                        <ProviderIcon size={16} className={config.color} />
                                    </div>
                                    <div className="text-sm font-medium text-textMain">{provider.name}</div>
                                    <div className="text-[10px] text-textMuted">{provider.models.length} models</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Model Selection */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-medium text-textMain mb-3">Model</h3>
                    <div className="space-y-2">
                        {currentProvider?.models.map((model) => {
                            const pricing = pricingData.get(model);
                            const modelInfo = pricing ? {
                                description: pricing.description,
                                context: pricing.contextWindow,
                                speed: pricing.speed
                            } : MODEL_INFO[model] || { 
                                description: 'Language model', 
                                context: 'N/A', 
                                speed: 'N/A' 
                            };
                            const isSelected = tempModel === model;
                            const costPer1K = pricing ? getCostPer1KTokens(pricing) : null;
                            
                            return (
                                <button
                                    key={model}
                                    onClick={() => setTempModel(model)}
                                    className={`
                                        w-full p-4 rounded-xl border transition-all text-left
                                        ${isSelected 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-border hover:border-primary/50 bg-surface'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${providerConfig.bgColor} flex items-center justify-center`}>
                                                <Icon size={14} className={providerConfig.color} />
                                            </div>
                                            <span className="font-medium text-textMain">{model}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {costPer1K && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-background rounded-lg border border-border">
                                                    <CurrencyDollar size={10} weight="bold" className="text-primary" />
                                                    <span className="text-xs text-textMain font-medium">
                                                        {costPer1K.average.toFixed(4)}
                                                    </span>
                                                    <span className="text-[10px] text-textMuted">/1K tokens</span>
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check size={12} weight="bold" className="text-black" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-textMuted mb-2 pl-11">{modelInfo.description}</p>
                                    <div className="flex items-center gap-4 pl-11 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-textMuted">Context:</span>
                                            <span className="text-xs font-mono text-primary">{modelInfo.context}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-textMuted">Speed:</span>
                                            <span className={`text-xs font-medium ${
                                                modelInfo.speed === 'Very Fast' ? 'text-green-400' :
                                                modelInfo.speed === 'Fast' ? 'text-yellow-400' :
                                                modelInfo.speed === 'Medium' ? 'text-orange-400' : 'text-red-400'
                                            }`}>
                                                {modelInfo.speed}
                                            </span>
                                        </div>
                                        {costPer1K && (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-textMuted">Input:</span>
                                                    <span className="text-xs text-green-400">${costPer1K.input.toFixed(4)}/1K</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-textMuted">Output:</span>
                                                    <span className="text-xs text-yellow-400">${costPer1K.output.toFixed(4)}/1K</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-surface/30">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-textMuted">
                            Selected: <span className="text-textMain font-medium">{tempModel}</span>
                        </div>
                        {pricingData.get(tempModel) && (
                            <div className="flex items-center gap-1 text-xs text-textMuted">
                                <CurrencyDollar size={10} weight="bold" className="text-primary" />
                                <span className="text-primary font-medium">
                                    {getCostPer1KTokens(pricingData.get(tempModel)!).average.toFixed(4)}
                                </span>
                                <span>/1K tokens avg</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-textMain hover:bg-surfaceHover rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-2 bg-primary text-black font-medium text-sm rounded-lg hover:bg-primaryHover transition-colors"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LLMSelectorModal;
