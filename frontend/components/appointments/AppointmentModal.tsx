/**
 * Appointment Modal Component
 * 
 * Modal for creating and editing appointments with form validation.
 */

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  MapPin,
  Note,
  Video,
  Buildings,
  CircleNotch,
} from '@phosphor-icons/react';
import type {
  Appointment,
  AppointmentType,
  AppointmentFormData,
  LocationType,
} from '@/types/appointments';
import {
  createAppointment,
  updateAppointment,
  getAppointmentTypes,
  getAvailability,
  formatDateForInput,
  formatTimeForInput,
} from '@/services/appointmentService';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (appointment: Appointment) => void;
  appointment?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  propertyAddress?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
  initialDate,
  initialTime,
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  propertyAddress,
}: AppointmentModalProps) {
  const isEditing = !!appointment;

  // Form state
  const [appointmentTypeId, setAppointmentTypeId] = useState('');
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [selectedTime, setSelectedTime] = useState(initialTime || '');
  const [attendeeName, setAttendeeName] = useState(leadName || '');
  const [attendeePhone, setAttendeePhone] = useState(leadPhone || '');
  const [attendeeEmail, setAttendeeEmail] = useState(leadEmail || '');
  const [location, setLocation] = useState<LocationType>('in_person');
  const [address, setAddress] = useState(propertyAddress || '');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load appointment types
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await getAppointmentTypes();
        setAppointmentTypes(types);
        if (types.length > 0 && !appointmentTypeId) {
          setAppointmentTypeId(types[0]?.id || '');
        }
      } catch (err) {
        console.error('Failed to load appointment types:', err);
      }
    };
    loadTypes();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (appointment) {
      setAppointmentTypeId(appointment.appointmentTypeId || '');
      setSelectedDate(formatDateForInput(appointment.scheduledAt));
      setSelectedTime(formatTimeForInput(appointment.scheduledAt));
      setAttendeeName(appointment.attendeeName);
      setAttendeePhone(appointment.attendeePhone || '');
      setAttendeeEmail(appointment.attendeeEmail || '');
      setLocation(appointment.locationType || 'in_person');
      setAddress(appointment.propertyAddress || '');
      setMeetingUrl(appointment.videoLink || '');
      setNotes(appointment.internalNotes || '');
    }
  }, [appointment]);

  // Load available time slots when date changes
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDate || !appointmentTypeId) return;

      setIsLoadingSlots(true);
      try {
        const result = await getAvailability({
          startDate: selectedDate,
          appointmentTypeId,
        });
        setAvailableSlots(result.slots.map((s) => s.time));
      } catch (err) {
        console.error('Failed to load availability:', err);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadAvailability();
  }, [selectedDate, appointmentTypeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!appointmentTypeId || !selectedDate || !selectedTime || !attendeeName) {
        throw new Error('Please fill in all required fields');
      }

      // Build scheduled datetime
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();

      // Get appointment type for duration
      const aptType = appointmentTypes.find((t) => t.id === appointmentTypeId);
      const duration = aptType?.durationMinutes || 30;

      const input: AppointmentFormData = {
        appointmentTypeId,
        scheduledAt,
        durationMinutes: duration,
        attendeeName,
        attendeePhone: attendeePhone || undefined,
        attendeeEmail: attendeeEmail || undefined,
        locationType: location,
        locationAddress: location === 'in_person' ? address : undefined,
        videoLink: location === 'video' ? meetingUrl : undefined,
        internalNotes: notes || undefined,
        leadId: leadId || undefined,
      };

      let result: Appointment;
      if (isEditing && appointment) {
        result = await updateAppointment(appointment.id, input);
      } else {
        result = await createAppointment(input);
      }

      onSuccess?.(result);
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAppointmentTypeId(appointmentTypes[0]?.id || '');
    setSelectedDate('');
    setSelectedTime('');
    setAttendeeName(leadName || '');
    setAttendeePhone(leadPhone || '');
    setAttendeeEmail(leadEmail || '');
    setLocation('in_person');
    setAddress(propertyAddress || '');
    setMeetingUrl('');
    setNotes('');
    setError(null);
  };

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <Dialog.Title className="text-lg font-semibold text-textMain">
                    {isEditing ? 'Edit Appointment' : 'Schedule Appointment'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X size={20} className="text-textMuted" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">
                      Appointment Type *
                    </label>
                    <select
                      value={appointmentTypeId}
                      onChange={(e) => setAppointmentTypeId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                      required
                    >
                      {appointmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.durationMinutes} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        Date *
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={today}
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <Clock size={16} className="inline mr-1" />
                        Time *
                      </label>
                      {isLoadingSlots ? (
                        <div className="flex items-center justify-center py-2.5">
                          <CircleNotch size={20} className="animate-spin text-primary" />
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <select
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                          required
                        >
                          <option value="">Select time</option>
                          {availableSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Attendee Info */}
                  <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">
                      <User size={16} className="inline mr-1" />
                      Attendee Name *
                    </label>
                    <input
                      type="text"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <Phone size={16} className="inline mr-1" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={attendeePhone}
                        onChange={(e) => setAttendeePhone(e.target.value)}
                        placeholder="+1 555-555-5555"
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <EnvelopeSimple size={16} className="inline mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">
                      Location Type
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'in_person', icon: Buildings, label: 'In Person' },
                        { value: 'video', icon: Video, label: 'Video Call' },
                        { value: 'phone', icon: Phone, label: 'Phone Call' },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLocation(value as LocationType)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                            location === value
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-background border-white/10 text-textMuted hover:border-white/20'
                          }`}
                        >
                          <Icon size={18} weight={location === value ? 'fill' : 'regular'} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address or Meeting URL based on location */}
                  {location === 'in_person' && (
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <MapPin size={16} className="inline mr-1" />
                        Property Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Main St, City, State"
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  )}

                  {location === 'video' && (
                    <div>
                      <label className="block text-sm font-medium text-textMuted mb-2">
                        <Video size={16} className="inline mr-1" />
                        Meeting URL
                      </label>
                      <input
                        type="url"
                        value={meetingUrl}
                        onChange={(e) => setMeetingUrl(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">
                      <Note size={16} className="inline mr-1" />
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 bg-background border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <CircleNotch size={20} className="animate-spin mx-auto" />
                      ) : isEditing ? (
                        'Save Changes'
                      ) : (
                        'Schedule Appointment'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
