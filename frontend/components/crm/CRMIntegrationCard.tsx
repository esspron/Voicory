/**
 * CRM Integration Card
 * 
 * Displays a CRM provider card with connection status and actions.
 */

import React from 'react';
import {
  Check,
  Warning,
  Plugs,
  PlugsConnected,
  Gear,
  ArrowSquareOut,
  Clock,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CRMIntegration, CRMProviderInfo } from '@/services/crmService';

interface CRMIntegrationCardProps {
  provider: CRMProviderInfo;
  integration?: CRMIntegration;
  onConnect: () => void;
  onConfigure: () => void;
}

const CRMIntegrationCard: React.FC<CRMIntegrationCardProps> = ({
  provider,
  integration,
  onConnect,
  onConfigure,
}) => {
  const isConnected = integration?.isConnected && integration?.isEnabled;
  const isComingSoon = provider.status === 'coming_soon';

  return (
    <div className={`
      relative group overflow-hidden rounded-2xl border transition-all duration-200
      ${isConnected
        ? 'bg-gradient-to-br from-primary/5 to-transparent border-primary/20 hover:border-primary/30'
        : isComingSoon
          ? 'bg-surface/40 border-white/5 opacity-60'
          : 'bg-surface/60 border-white/5 hover:border-white/10'
      }
    `}>
      {/* Ambient glow for connected state */}
      {isConnected && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl" />
      )}

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${isConnected
                ? 'bg-gradient-to-br from-primary/20 to-primary/10'
                : 'bg-white/5'
              }
            `}>
              {/* Placeholder for provider logo - using icon for now */}
              <Plugs
                size={24}
                weight="bold"
                className={isConnected ? 'text-primary' : 'text-textMuted'}
              />
            </div>

            <div>
              <h3 className="font-semibold text-textMain flex items-center gap-2">
                {provider.name}
                {isComingSoon && (
                  <Badge variant="default" size="sm">Coming Soon</Badge>
                )}
              </h3>
              <p className="text-sm text-textMuted mt-0.5">
                {provider.description}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {integration && !isComingSoon && (
            <Badge
              variant={isConnected ? 'success' : integration.lastError ? 'error' : 'default'}
              size="sm"
            >
              {isConnected ? (
                <>
                  <Check size={12} weight="bold" />
                  Connected
                </>
              ) : integration.lastError ? (
                <>
                  <Warning size={12} weight="bold" />
                  Error
                </>
              ) : (
                'Disabled'
              )}
            </Badge>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {provider.features.slice(0, 4).map((feature) => (
            <span
              key={feature}
              className="px-2 py-1 text-xs rounded-lg bg-white/5 text-textMuted"
            >
              {feature}
            </span>
          ))}
          {provider.features.length > 4 && (
            <span className="px-2 py-1 text-xs rounded-lg bg-white/5 text-textMuted">
              +{provider.features.length - 4} more
            </span>
          )}
        </div>

        {/* Last Sync Info (if connected) */}
        {integration?.lastSyncAt && (
          <div className="flex items-center gap-2 text-xs text-textMuted mb-4">
            <Clock size={14} />
            Last synced: {new Date(integration.lastSyncAt).toLocaleDateString()}
          </div>
        )}

        {/* Error Message */}
        {integration?.lastError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <Warning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 line-clamp-2">
              {integration.lastError}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isComingSoon ? (
            <Button variant="secondary" size="sm" disabled className="flex-1">
              Coming Soon
            </Button>
          ) : integration ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onConfigure}
                className="flex-1"
              >
                <Gear size={16} weight="bold" />
                Configure
              </Button>
              {provider.docsUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(provider.docsUrl, '_blank')}
                >
                  <ArrowSquareOut size={16} />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onConnect}
                className="flex-1"
              >
                <PlugsConnected size={16} weight="bold" />
                Connect
              </Button>
              {provider.docsUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(provider.docsUrl, '_blank')}
                >
                  <ArrowSquareOut size={16} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMIntegrationCard;
