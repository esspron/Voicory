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
  X,
} from '@phosphor-icons/react';
import {
  CalendarIntegrationCard,
  CalendarIntegrationSetup,
  AvailabilityEditor,
  AppointmentTypeCard,
} from '@/components/appointments';
import { Skeleton } from '@/components/ui';
import type { CalendarIntegration, AppointmentType, AppointmentTypeFormData } from '@/types/appointments';
import {
  getCalendarIntegrations,
  deleteCalendarIntegration,
  getAppointmentTypes,
  deleteAppointmentType,
  createAppointmentType,
  updateAppointmentType,
} from '@/services/appointmentService';

type TabId = 'integrations' | 'availability' | 'types';

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: 'integrations', label: 'Calendar Connections', icon: Calendar },
  { id: 'availability', label: 'Availability', icon: Clock },
  { id: 'types', label: 'Appointment Types', icon: Gear },
];

const DEFAULT_FORM: AppointmentTypeFormData = {
  name: '',
  description: '',
  category: 'general',
  durationMinutes: 30,
  isActive: true,
  requiresConfirmation: false,
  defaultLocation: 'phone',
};

/** Inline modal for creating / editing an appointment type. */
function AppointmentTypeModal({
  isOpen,
  editType,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  editType: AppointmentType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AppointmentTypeFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editType) {
      setForm({
        name: editType.name,
        description: editType.description || '',
        category: editType.category,
        durationMinutes: editType.durationMinutes,
        isActive: editType.isActive,
        requiresConfirmation: editType.requiresConfirmation,
        defaultLocation: editType.defaultLocation,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  }, [editType, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editType) {
        await updateAppointmentType(editType.id, form);
      } else {
        await createAppointmentType(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-textMain">
            {editType ? 'Edit Appointment Type' : 'New Appointment Type'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} className="text-textMuted" />
          </button>
        </div>
        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Name *</label>
            <input
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-textMain text-sm focus:outline-none focus:border-primary/50"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Buyer Consultation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-textMain text-sm focus:outline-none focus:border-primary/50 resize-none"
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Duration (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-textMain text-sm focus:outline-none focus:border-primary/50"
                value={form.durationMinutes || 30}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Location</label>
              <select
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-textMain text-sm focus:outline-none focus:border-primary/50"
                value={form.defaultLocation || 'phone'}
                onChange={(e) => setForm((f) => ({ ...f, defaultLocation: e.target.value as any }))}
              >
                <option value="phone">Phone</option>
                <option value="video">Video</option>
                <option value="in_person">In Person</option>
                <option value="property">Property</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Category</label>
            <select
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-textMain text-sm focus:outline-none focus:border-primary/50"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
            >
              {['general','showing','listing_appointment','buyer_consultation','seller_consultation','market_analysis','property_tour','open_house','closing'].map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-textMuted cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary"
                checked={!!form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-textMuted cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary"
                checked={!!form.requiresConfirmation}
                onChange={(e) => setForm((f) => ({ ...f, requiresConfirmation: e.target.checked }))}
              />
              Requires Confirmation
            </label>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/10 bg-black/20">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-textMuted hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editType ? 'Save Changes' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple settings info panel for an active integration — no deep re-config needed. */
function IntegrationSettingsPanel({
  integration,
  onClose,
}: {
  integration: CalendarIntegration;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-textMain">Integration Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} className="text-textMuted" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-black/30 border border-white/5 rounded-xl">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-textMain capitalize">{integration.provider.replace(/_/g, ' ')}</p>
              <p className="text-sm text-textMuted">{integration.externalAccountEmail || integration.externalAccountId || 'Connected'}</p>
            </div>
          </div>
          <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-textMuted">Status</span>
              <span className={integration.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{integration.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Sync enabled</span>
              <span className="text-textMain">{integration.syncEnabled ? 'Yes' : 'No'}</span>
            </div>
            {integration.calendarName && (
              <div className="flex justify-between">
                <span className="text-textMuted">Calendar</span>
                <span className="text-textMain">{integration.calendarName}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-textMuted">
            To re-configure, disconnect this integration and reconnect via the Connect Calendar flow.
          </p>
        </div>
        <div className="flex justify-end p-5 border-t border-white/10 bg-black/20">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarIntegration() {
  const [activeTab, setActiveTab] = useState<TabId>('integrations');
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  // Appointment type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  // Integration settings panel
  const [settingsIntegration, setSettingsIntegration] = useState<CalendarIntegration | null>(null);

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

  const openCreateType = () => {
    setEditingType(null);
    setTypeModalOpen(true);
  };

  const openEditType = (type: AppointmentType) => {
    setEditingType(type);
    setTypeModalOpen(true);
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
                  onSettings={() => setSettingsIntegration(integration)}
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
              onClick={openCreateType}
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
                onClick={openCreateType}
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
                  onEdit={() => openEditType(type)}
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

      {/* Appointment Type Create/Edit Modal */}
      <AppointmentTypeModal
        isOpen={typeModalOpen}
        editType={editingType}
        onClose={() => setTypeModalOpen(false)}
        onSaved={loadData}
      />

      {/* Integration Settings Panel */}
      {settingsIntegration && (
        <IntegrationSettingsPanel
          integration={settingsIntegration}
          onClose={() => setSettingsIntegration(null)}
        />
      )}
    </div>
  );
}
