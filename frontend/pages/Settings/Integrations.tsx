import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col">
        <div className="mb-3">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center text-xl font-bold text-textMain border border-border group-hover:border-primary/30 transition-colors">
                {/* Placeholder icon using first letter if no icon provided */}
                {provider.icon ? <img src={provider.icon} alt={provider.name} className="w-6 h-6" /> : provider.name[0]}
            </div>
        </div>
        <h3 className="text-base font-semibold text-textMain mb-1 flex items-center gap-2">
            {provider.name}
            {provider.isDeprecated && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">Deprecated</span>}
        </h3>
        <p className="text-xs text-textMuted leading-relaxed">
            {provider.description}
        </p>
    </div>
);

const CategorySection: React.FC<{ category: Category }> = ({ category }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mb-8">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-lg font-semibold text-textMain mb-4 w-full hover:text-primary transition-colors"
            >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                {category.title}
            </button>
            
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {category.providers.map((provider) => (
                        <ProviderCard key={provider.name} provider={provider} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Integrations: React.FC = () => {
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

    return (
        <div className="max-w-7xl mx-auto mb-20">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-textMain">Integrations</h1>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-2.5 text-textMuted" />
                    <input 
                        type="text" 
                        placeholder="Search integrations..." 
                        className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-textMain outline-none focus:border-primary placeholder:text-gray-600"
                    />
                </div>
            </div>

            <div className="space-y-2">
                {categories.map((category) => (
                    <CategorySection key={category.title} category={category} />
                ))}
            </div>
        </div>
    );
};

export default Integrations;
