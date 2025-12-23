/**
 * Calendar Integration Card Component
 * 
 * Displays a connected calendar integration with status and actions.
 */

import {
  Calendar,
  CheckCircle,
  Warning,
  DotsThree,
  ArrowClockwise,
  Trash,
  Gear,
  GoogleLogo,
  CalendarBlank,
} from '@phosphor-icons/react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { CalendarIntegration, CalendarProvider } from '@/types/appointments';

interface CalendarIntegrationCardProps {
  integration: CalendarIntegration;
  onRefresh?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
}

const PROVIDER_INFO: Record<CalendarProvider, { name: string; icon: typeof Calendar; color: string }> = {
  cal_com: {
    name: 'Cal.com',
    icon: CalendarBlank,
    color: 'text-[#292929]',
  },
  calendly: {
    name: 'Calendly',
    icon: CalendarBlank,
    color: 'text-[#006BFF]',
  },
  google_calendar: {
    name: 'Google Calendar',
    icon: GoogleLogo,
    color: 'text-[#4285F4]',
  },
  follow_up_boss: {
    name: 'Follow Up Boss',
    icon: Calendar,
    color: 'text-[#FF6B35]',
  },
};

// Helper function to format relative time
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return options?.addSuffix ? 'just now' : 'less than a minute';
  if (diffMins < 60) return options?.addSuffix ? `${diffMins} minutes ago` : `${diffMins} minutes`;
  if (diffHours < 24) return options?.addSuffix ? `${diffHours} hours ago` : `${diffHours} hours`;
  return options?.addSuffix ? `${diffDays} days ago` : `${diffDays} days`;
}

export function CalendarIntegrationCard({
  integration,
  onRefresh,
  onDisconnect,
  onSettings,
}: CalendarIntegrationCardProps) {
  const provider = PROVIDER_INFO[integration.provider];
  const Icon = provider.icon;

  const isExpired = integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date();
  const isActive = integration.isConnected && !isExpired;

  return (
    <div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 overflow-hidden transition-all hover:border-white/10">
      {/* Ambient glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 blur-3xl" />

      <div className="relative flex items-start justify-between">
        {/* Provider Info */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center ${provider.color}`}>
            <Icon size={24} weight="bold" />
          </div>
          <div>
            <h3 className="font-semibold text-textMain">{provider.name}</h3>
            {integration.externalUserId && (
              <p className="text-sm text-textMuted">{integration.externalUserId}</p>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <DotsThree size={20} weight="bold" className="text-textMuted" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-surface border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
              {onRefresh && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onRefresh}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${
                        active ? 'bg-white/10 text-textMain' : 'text-textMuted'
                      }`}
                    >
                      <ArrowClockwise size={18} />
                      Refresh Connection
                    </button>
                  )}
                </Menu.Item>
              )}
              {onSettings && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onSettings}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${
                        active ? 'bg-white/10 text-textMain' : 'text-textMuted'
                      }`}
                    >
                      <Gear size={18} />
                      Settings
                    </button>
                  )}
                </Menu.Item>
              )}
              {onDisconnect && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onDisconnect}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${
                        active ? 'bg-red-500/20 text-red-400' : 'text-red-400'
                      }`}
                    >
                      <Trash size={18} />
                      Disconnect
                    </button>
                  )}
                </Menu.Item>
              )}
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Status */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <CheckCircle size={18} weight="fill" className="text-green-400" />
              <span className="text-sm text-green-400">Connected</span>
            </>
          ) : (
            <>
              <Warning size={18} weight="fill" className="text-amber-400" />
              <span className="text-sm text-amber-400">
                {isExpired ? 'Token Expired' : 'Disconnected'}
              </span>
            </>
          )}
        </div>

        {integration.lastSyncAt && (
          <span className="text-xs text-textMuted">
            Last synced {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Settings Summary */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-textMuted">Default calendar:</span>
          <span className="text-textMain truncate">
            {(integration.settings as Record<string, string>)?.['defaultCalendarId'] || 'Primary'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-textMuted">Buffer:</span>
          <span className="text-textMain">
            {integration.bufferBeforeMinutes || 0}m before, {integration.bufferAfterMinutes || 0}m after
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      {!isActive && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2">
          <Warning size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            {isExpired
              ? 'Your authorization has expired. Please reconnect to continue using this calendar.'
              : 'This integration is not active. Please reconnect.'}
          </p>
        </div>
      )}
    </div>
  );
}
