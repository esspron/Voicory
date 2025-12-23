/**
 * Appointment Card Component
 * 
 * Displays an appointment with status, attendee info, and quick actions.
 */

import {
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  VideoCamera,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  DotsThreeVertical,
  House,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { Appointment } from '@/types/appointments';
import {
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  formatAppointmentDateTime,
  canCancelAppointment,
  canRescheduleAppointment,
} from '@/services/appointmentService';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  onClick,
  onConfirm,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
  compact = false,
}: AppointmentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getLocationIcon = () => {
    switch (appointment.locationType) {
      case 'video':
        return <VideoCamera size={14} weight="bold" className="text-blue-400" />;
      case 'phone':
        return <Phone size={14} weight="bold" className="text-green-400" />;
      case 'property':
        return <House size={14} weight="bold" className="text-amber-400" />;
      default:
        return <MapPin size={14} weight="bold" className="text-textMuted" />;
    }
  };

  const getLocationLabel = () => {
    switch (appointment.locationType) {
      case 'video':
        return 'Video Call';
      case 'phone':
        return 'Phone Call';
      case 'property':
        return appointment.propertyAddress || 'Property';
      default:
        return appointment.locationAddress || 'In Person';
    }
  };

  const isUpcoming = new Date(appointment.scheduledAt) > new Date();
  const isPast = new Date(appointment.scheduledAt) < new Date();

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="group flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: appointment.appointmentType?.color || '#10B981' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-textMain truncate">
            {appointment.attendeeName}
          </p>
          <p className="text-xs text-textMuted">
            {formatAppointmentDateTime(appointment.scheduledAt, appointment.timezone)}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getAppointmentStatusColor(appointment.status)}`}
        >
          {getAppointmentStatusLabel(appointment.status)}
        </span>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 overflow-hidden"
    >
      {/* Color accent */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
        style={{ backgroundColor: appointment.appointmentType?.color || '#10B981' }}
      />

      {/* Ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/0 group-hover:bg-primary/10 blur-3xl transition-all duration-500" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-textMain truncate group-hover:text-primary transition-colors">
              {appointment.attendeeName}
            </h3>
            {appointment.rescheduleCount > 0 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                <ArrowsClockwise size={10} />
                {appointment.rescheduleCount}x
              </span>
            )}
          </div>
          <p className="text-sm text-textMuted">{appointment.appointmentTypeName}</p>
        </div>

        {/* Status & Menu */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getAppointmentStatusColor(appointment.status)}`}
          >
            {getAppointmentStatusLabel(appointment.status)}
          </span>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg text-textMuted hover:text-textMain hover:bg-white/10 transition-colors"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
                  {appointment.status === 'scheduled' && onConfirm && (
                    <button
                      onClick={() => {
                        onConfirm();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textMain hover:bg-white/5 transition-colors"
                    >
                      <CheckCircle size={16} className="text-green-400" />
                      Confirm
                    </button>
                  )}
                  {canRescheduleAppointment(appointment) && onReschedule && (
                    <button
                      onClick={() => {
                        onReschedule();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textMain hover:bg-white/5 transition-colors"
                    >
                      <ArrowsClockwise size={16} className="text-blue-400" />
                      Reschedule
                    </button>
                  )}
                  {isPast && ['scheduled', 'confirmed'].includes(appointment.status) && (
                    <>
                      {onComplete && (
                        <button
                          onClick={() => {
                            onComplete();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textMain hover:bg-white/5 transition-colors"
                        >
                          <CheckCircle size={16} className="text-emerald-400" />
                          Mark Completed
                        </button>
                      )}
                      {onNoShow && (
                        <button
                          onClick={() => {
                            onNoShow();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textMain hover:bg-white/5 transition-colors"
                        >
                          <XCircle size={16} className="text-orange-400" />
                          Mark No-Show
                        </button>
                      )}
                    </>
                  )}
                  {canCancelAppointment(appointment) && onCancel && (
                    <button
                      onClick={() => {
                        onCancel();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <XCircle size={16} />
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2" onClick={onClick}>
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={16} className="text-primary" />
          <span className="text-textMain">
            {formatAppointmentDateTime(appointment.scheduledAt, appointment.timezone)}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-textMuted" />
          <span className="text-textMuted">{appointment.durationMinutes} minutes</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm">
          {getLocationIcon()}
          <span className="text-textMuted truncate">{getLocationLabel()}</span>
        </div>

        {/* Contact Info */}
        {(appointment.attendeePhone || appointment.attendeeEmail) && (
          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-textMuted" />
            <span className="text-textMuted truncate">
              {appointment.attendeePhone || appointment.attendeeEmail}
            </span>
          </div>
        )}

        {/* Property (Real Estate) */}
        {appointment.propertyAddress && appointment.locationType !== 'property' && (
          <div className="flex items-center gap-2 text-sm">
            <House size={16} className="text-amber-400" />
            <span className="text-textMuted truncate">{appointment.propertyAddress}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {appointment.attendeeNotes && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-textMuted line-clamp-2">{appointment.attendeeNotes}</p>
        </div>
      )}

      {/* Upcoming indicator */}
      {isUpcoming && appointment.status === 'confirmed' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Confirmed
        </div>
      )}
    </div>
  );
}
