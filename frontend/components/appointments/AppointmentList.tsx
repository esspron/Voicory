/**
 * Appointment List Component
 * 
 * Displays a list of appointments with filtering and pagination.
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  MagnifyingGlass,
  Funnel,
  CaretLeft,
  CaretRight,
  CalendarBlank,
  Plus,
} from '@phosphor-icons/react';
import { AppointmentCard } from './AppointmentCard';
import { Skeleton } from '@/components/ui';
import type { Appointment, AppointmentStatus } from '@/types/appointments';
import {
  getAppointments,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
  markAppointmentNoShow,
} from '@/services/appointmentService';

interface AppointmentListProps {
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateClick?: () => void;
  onReschedule?: (appointment: Appointment) => void;
  initialFilter?: {
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
  };
  compact?: boolean;
  maxItems?: number;
}

export function AppointmentList({
  onAppointmentClick,
  onCreateClick,
  onReschedule,
  initialFilter,
  compact = false,
  maxItems,
}: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(maxItems || 10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>(
    initialFilter?.status || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: initialFilter?.startDate || '',
    end: initialFilter?.endDate || '',
  });

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAppointments({
        status: statusFilter || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        page,
        pageSize,
      });

      setAppointments(result.appointments);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateRange.start, dateRange.end, page]);

  const handleConfirm = async (appointment: Appointment) => {
    try {
      await confirmAppointment(appointment.id);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to confirm appointment:', err);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await cancelAppointment(appointment.id, {
        cancelledBy: 'user',
        notifyAttendee: true,
      });
      fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const handleComplete = async (appointment: Appointment) => {
    try {
      await completeAppointment(appointment.id);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to complete appointment:', err);
    }
  };

  const handleNoShow = async (appointment: Appointment) => {
    try {
      await markAppointmentNoShow(appointment.id);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to mark no-show:', err);
    }
  };

  // Filter appointments by search
  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.attendeeName.toLowerCase().includes(query) ||
      apt.attendeePhone?.toLowerCase().includes(query) ||
      apt.attendeeEmail?.toLowerCase().includes(query) ||
      apt.propertyAddress?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  if (compact) {
    return (
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-6">
            <CalendarBlank size={32} className="mx-auto text-textMuted mb-2" />
            <p className="text-sm text-textMuted">No appointments</p>
          </div>
        ) : (
          filteredAppointments.slice(0, maxItems).map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              compact
              onClick={() => onAppointmentClick?.(appointment)}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"
          />
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Funnel size={18} className="text-textMuted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
            className="px-3 py-2 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
          >
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-textMuted" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
          />
          <span className="text-textMuted">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Create Button */}
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <Plus size={18} weight="bold" />
            New Appointment
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
            <CalendarBlank size={40} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-textMain mb-1">No appointments found</h3>
          <p className="text-textMuted text-center max-w-sm">
            {statusFilter || dateRange.start || dateRange.end
              ? 'Try adjusting your filters to see more appointments.'
              : 'Schedule your first appointment to get started.'}
          </p>
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} weight="bold" />
              New Appointment
            </button>
          )}
        </div>
      ) : (
        /* Appointments Grid */
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onClick={() => onAppointmentClick?.(appointment)}
                onConfirm={() => handleConfirm(appointment)}
                onCancel={() => handleCancel(appointment)}
                onReschedule={() => onReschedule?.(appointment)}
                onComplete={() => handleComplete(appointment)}
                onNoShow={() => handleNoShow(appointment)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <p className="text-sm text-textMuted">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} appointments
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretLeft size={18} />
                </button>
                <span className="px-3 py-1 text-sm text-textMuted">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
