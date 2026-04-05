/**
 * Calendar Integration Settings Page
 * 
 * Manage calendar connections, availability, and appointment types.
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Gear,
  CalendarBlank,
  Warning,
} from '@phosphor-icons/react';
import {
  CalendarIntegrationCard,
  CalendarIntegrationSetup,
  AvailabilityEditor,
  AppointmentTypeCard,
} from '@/components/appointments';
import { Skeleton } from '@/components/ui';
import type { CalendarIntegration, AppointmentType } from '@/types/appointments';
import {
  getCalendarIntegrations,
  deleteCalendarIntegration,
  getAppointmentTypes,
  deleteAppointmentType,
} from '@/services/appointmentService';

type TabId = 'integrations' | 'availability' | 'types';

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: 'integrations', label: 'Calendar Connections', icon: Calendar },
  { id: 'availability', label: 'Availability', icon: Clock },
  { id: 'types', label: 'Appointment Types', icon: Gear },
];

export default function CalendarIntegration() {
  const [activeTab, setActiveTab] = useState<TabId>('integrations');
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [integrationsData, typesData] = await Promise.all([
        getCalendarIntegrations(),
        getAppointmentTypes(),
      ]);

      setIntegrations(integrationsData);
      setAppointmentTypes(typesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;

    try {
      await deleteCalendarIntegration(integrationId);
      setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
    } catch (err) {
      console.error('Failed to disconnect calendar:', err);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this appointment type?')) return;

    try {
      await deleteAppointmentType(typeId);
      setAppointmentTypes((prev) => prev.filter((t) => t.id !== typeId));
    } catch (err) {
      console.error('Failed to delete appointment type:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-textMain">Calendar & Scheduling</h1>
        <p className="text-textMuted mt-1">
          Connect your calendar and manage appointment availability
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                  : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
              )}
              <tab.icon
                size={18}
                weight={isActive ? 'fill' : 'regular'}
                className={isActive ? 'text-primary' : 'group-hover:text-primary'}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
          <Warning size={20} className="text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-textMain">Connected Calendars</h2>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              <Plus size={18} weight="bold" />
              Connect Calendar
            </button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface/50 border border-white/5 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
                <CalendarBlank size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-1">No calendars connected</h3>
              <p className="text-textMuted text-center max-w-sm mb-4">
                Connect a calendar to enable real-time availability checking and appointment syncing.
              </p>
              <button
                onClick={() => setIsSetupOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-xl"
              >
                <Plus size={18} weight="bold" />
                Connect Calendar
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => (
                <CalendarIntegrationCard
                  key={integration.id}
                  integration={integration}
                  onRefresh={() => loadData()}
                  onDisconnect={() => handleDisconnect(integration.id)}
                  onSettings={() => {
                    // TODO: Open settings modal
                    console.log('Open settings for', integration.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <AvailabilityEditor onSave={() => loadData()} />
        </div>
      )}

      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-textMain">Appointment Types</h2>
            <button
              onClick={() => {
                // TODO: Open create appointment type modal
                console.log('Create new appointment type');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              <Plus size={18} weight="bold" />
              New Type
            </button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : appointmentTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface/50 border border-white/5 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
                <Gear size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-1">No appointment types</h3>
              <p className="text-textMuted text-center max-w-sm mb-4">
                Create appointment types to define different meeting formats and durations.
              </p>
              <button
                onClick={() => {
                  // TODO: Open create modal
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-xl"
              >
                <Plus size={18} weight="bold" />
                Create Type
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointmentTypes.map((type) => (
                <AppointmentTypeCard
                  key={type.id}
                  appointmentType={type}
                  onEdit={() => {
                    // TODO: Open edit modal
                    console.log('Edit', type.id);
                  }}
                  onDelete={() => handleDeleteType(type.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Setup Modal */}
      <CalendarIntegrationSetup
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSuccess={() => {
          loadData();
          setIsSetupOpen(false);
        }}
      />
    </div>
  );
}
