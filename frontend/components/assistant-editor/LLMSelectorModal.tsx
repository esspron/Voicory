import React, { useState, useEffect } from 'react';
import { X, Check, Zap, Brain, Cpu, Sparkles } from 'lucide-react';

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
    openai: { icon: Sparkles, color: 'text-green-400', bgColor: 'bg-green-500/20' },
    anthropic: { icon: Brain, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    groq: { icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    together: { icon: Cpu, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
};

// Model descriptions
const MODEL_INFO: Record<string, { description: string; context: string; speed: string }> = {
    'gpt-4o': { description: 'Most capable model, best for complex tasks', context: '128K', speed: 'Medium' },
    'gpt-4o-mini': { description: 'Smaller, faster, cheaper than GPT-4o', context: '128K', speed: 'Fast' },
    'gpt-4-turbo': { description: 'Previous generation, still powerful', context: '128K', speed: 'Medium' },
    'gpt-3.5-turbo': { description: 'Fast and cost-effective', context: '16K', speed: 'Very Fast' },
    'claude-3.5-sonnet': { description: 'Best Claude model for most tasks', context: '200K', speed: 'Fast' },
    'claude-3-opus': { description: 'Most powerful Claude, highest quality', context: '200K', speed: 'Slow' },
    'claude-3-haiku': { description: 'Fastest Claude, great for simple tasks', context: '200K', speed: 'Very Fast' },
    'llama-3.1-70b': { description: 'Excellent open-source model', context: '128K', speed: 'Fast' },
    'llama-3.1-8b': { description: 'Smaller Llama, very fast', context: '128K', speed: 'Very Fast' },
    'mixtral-8x7b': { description: 'Mixture of experts, efficient', context: '32K', speed: 'Fast' },
    'Qwen3-30B-A3B': { description: 'Multilingual, great for Asian languages', context: '32K', speed: 'Fast' },
    'Llama-3.2-90B': { description: 'Largest Llama model available', context: '128K', speed: 'Medium' },
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                        <X size={20} />
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
                                            <Check size={12} className="text-primary" />
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
                            const modelInfo = MODEL_INFO[model] || { 
                                description: 'Language model', 
                                context: 'N/A', 
                                speed: 'N/A' 
                            };
                            const isSelected = tempModel === model;
                            
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
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check size={12} className="text-black" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-textMuted mb-2 pl-11">{modelInfo.description}</p>
                                    <div className="flex items-center gap-4 pl-11">
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
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-surface/30">
                    <div className="text-sm text-textMuted">
                        Selected: <span className="text-textMain font-medium">{tempModel}</span>
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
        </div>
    );
};

export default LLMSelectorModal;
