/**
 * Availability Editor Component
 * 
 * Weekly availability schedule editor for managing booking hours.
 */

import { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash,
  CircleNotch,
  CheckCircle,
  CalendarBlank,
  Warning,
} from '@phosphor-icons/react';
import type { AvailabilitySlotFormData } from '@/types/appointments';
import {
  getAvailabilitySlots,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/services/appointmentService';

interface AvailabilityEditorProps {
  integrationId?: string;
  onSave?: () => void;
}

// Local type for day of week
type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

const DAYS_OF_WEEK: { id: DayOfWeek; name: string; short: string }[] = [
  { id: 'monday', name: 'Monday', short: 'Mon' },
  { id: 'tuesday', name: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', name: 'Wednesday', short: 'Wed' },
  { id: 'thursday', name: 'Thursday', short: 'Thu' },
  { id: 'friday', name: 'Friday', short: 'Fri' },
  { id: 'saturday', name: 'Saturday', short: 'Sat' },
  { id: 'sunday', name: 'Sunday', short: 'Sun' },
];

interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeekSchedule = Record<DayOfWeek, DaySchedule>;

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
  tuesday: { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
  wednesday: { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
  thursday: { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
  friday: { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] },
};

export function AvailabilityEditor({ integrationId: _integrationId, onSave }: AvailabilityEditorProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load existing availability
  useEffect(() => {
    const loadAvailability = async () => {
      setIsLoading(true);
      try {
        const slots = await getAvailabilitySlots();

        // Transform slots into schedule format
        const newSchedule: WeekSchedule = { ...DEFAULT_SCHEDULE };

        // Reset all days to empty
        DAYS_OF_WEEK.forEach((day) => {
          newSchedule[day.id] = { enabled: false, slots: [] };
        });

        // Map day of week number to day name
        const dayNumberToName: Record<number, DayOfWeek> = {
          0: 'sunday',
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday',
          6: 'saturday',
        };

        // Populate from database
        slots.forEach((slot) => {
          const dayName = dayNumberToName[slot.dayOfWeek];
          if (dayName && newSchedule[dayName]) {
            if (!newSchedule[dayName].enabled) {
              newSchedule[dayName].enabled = true;
            }
            newSchedule[dayName].slots.push({
              id: slot.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          }
        });

        setSchedule(newSchedule);
      } catch (err) {
        console.error('Failed to load availability:', err);
        // Keep default schedule on error
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, []);

  const toggleDay = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        enabled: !prev[day].enabled,
        slots: !prev[day].enabled
          ? [{ startTime: '09:00', endTime: '17:00' }]
          : prev[day].slots,
      },
    }));
    setSaveStatus('idle');
  };

  const addSlot = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { startTime: '09:00', endTime: '17:00' }],
      },
    }));
    setSaveStatus('idle');
  };

  const removeSlot = (day: DayOfWeek, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
    setSaveStatus('idle');
  };

  const updateSlot = (day: DayOfWeek, index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);

    // Map day name to day number
    const dayNameToNumber: Record<DayOfWeek, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    try {
      // Get existing slots for comparison
      const existingSlots = await getAvailabilitySlots();
      const existingIds = new Set(existingSlots.map((s) => s.id));

      // Collect all slots to save
      const newSlots: AvailabilitySlotFormData[] = [];
      const slotsToKeep = new Set<string>();

      for (const day of DAYS_OF_WEEK) {
        if (!schedule[day.id].enabled) continue;

        for (const slot of schedule[day.id].slots) {
          if (slot.id) {
            // Existing slot - update
            slotsToKeep.add(slot.id);
            await updateAvailabilitySlot(slot.id, {
              startTime: slot.startTime,
              endTime: slot.endTime,
              dayOfWeek: dayNameToNumber[day.id],
            });
          } else {
            // New slot
            newSlots.push({
              dayOfWeek: dayNameToNumber[day.id],
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          }
        }
      }

      // Delete removed slots
      for (const id of existingIds) {
        if (!slotsToKeep.has(id)) {
          await deleteAvailabilitySlot(id);
        }
      }

      // Create new slots
      for (const slot of newSlots) {
        await createAvailabilitySlot(slot);
      }

      setSaveStatus('saved');
      onSave?.();

      // Reset status after delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save availability');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToAll = (sourceDay: DayOfWeek) => {
    const sourceSchedule = schedule[sourceDay];
    if (!sourceSchedule.enabled) return;

    setSchedule((prev) => {
      const newSchedule = { ...prev };
      DAYS_OF_WEEK.forEach((day) => {
        if (day.id !== sourceDay) {
          newSchedule[day.id] = {
            enabled: sourceSchedule.enabled,
            slots: sourceSchedule.slots.map((s) => ({ ...s, id: undefined })),
          };
        }
      });
      return newSchedule;
    });
    setSaveStatus('idle');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-textMain">Weekly Availability</h3>
          <p className="text-sm text-textMuted">
            Set the hours when appointments can be booked
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <CheckCircle size={18} weight="fill" />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
          <Warning size={20} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.id}
            className={`p-4 rounded-xl border transition-all ${
              schedule[day.id].enabled
                ? 'bg-surface border-white/10'
                : 'bg-surface/50 border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Day Toggle */}
              <button
                onClick={() => toggleDay(day.id)}
                className={`w-24 flex items-center gap-2 ${
                  schedule[day.id].enabled ? 'text-textMain' : 'text-textMuted'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border-2 transition-all ${
                    schedule[day.id].enabled
                      ? 'bg-primary border-primary'
                      : 'border-white/30'
                  }`}
                >
                  {schedule[day.id].enabled && (
                    <CheckCircle size={12} weight="fill" className="text-black" />
                  )}
                </div>
                <span className="font-medium">{day.short}</span>
              </button>

              {/* Time Slots */}
              {schedule[day.id].enabled ? (
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {schedule[day.id].slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-background rounded-lg">
                        <Clock size={14} className="text-textMuted" />
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(day.id, index, 'startTime', e.target.value)}
                          className="bg-transparent text-sm text-textMain focus:outline-none"
                        />
                        <span className="text-textMuted">-</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(day.id, index, 'endTime', e.target.value)}
                          className="bg-transparent text-sm text-textMain focus:outline-none"
                        />
                      </div>
                      {schedule[day.id].slots.length > 1 && (
                        <button
                          onClick={() => removeSlot(day.id, index)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => addSlot(day.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-textMuted transition-colors"
                    title="Add time slot"
                  >
                    <Plus size={18} />
                  </button>

                  {/* Copy to all days */}
                  <button
                    onClick={() => copyToAll(day.id)}
                    className="ml-2 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Copy to all days"
                  >
                    Copy to all
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 text-textMuted">
                  <CalendarBlank size={18} />
                  <span className="text-sm">Unavailable</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            setSchedule(DEFAULT_SCHEDULE);
            setSaveStatus('idle');
          }}
          className="px-4 py-2 text-sm text-textMuted hover:text-textMain hover:bg-white/10 rounded-xl transition-colors"
        >
          Reset to Default
        </button>
        <button
          onClick={() => {
            const allEnabled: WeekSchedule = {} as WeekSchedule;
            DAYS_OF_WEEK.forEach((day) => {
              allEnabled[day.id] = { enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] };
            });
            setSchedule(allEnabled);
            setSaveStatus('idle');
          }}
          className="px-4 py-2 text-sm text-textMuted hover:text-textMain hover:bg-white/10 rounded-xl transition-colors"
        >
          Enable All Days
        </button>
        <button
          onClick={() => {
            const weekdaysOnly: WeekSchedule = { ...DEFAULT_SCHEDULE };
            setSchedule(weekdaysOnly);
            setSaveStatus('idle');
          }}
          className="px-4 py-2 text-sm text-textMuted hover:text-textMain hover:bg-white/10 rounded-xl transition-colors"
        >
          Weekdays Only
        </button>
      </div>
    </div>
  );
}
