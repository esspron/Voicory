/**
 * Appointment Type Card Component
 * 
 * Displays an appointment type with duration, description, and actions.
 */

import {
  Clock,
  DotsThree,
  PencilSimple,
  Trash,
  Buildings,
  Video,
  Phone,
  House,
  Briefcase,
  Handshake,
  MagnifyingGlass,
  ChartBar,
} from '@phosphor-icons/react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { AppointmentType } from '@/types/appointments';

interface AppointmentTypeCardProps {
  appointmentType: AppointmentType;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Clock> = {
  showing: House,
  listing_appointment: Buildings,
  buyer_consultation: Handshake,
  seller_consultation: Briefcase,
  market_analysis: ChartBar,
  property_tour: House,
  open_house: MagnifyingGlass,
  closing: Buildings,
  general: Clock,
};

const CATEGORY_COLORS: Record<string, string> = {
  showing: 'from-blue-500/20 to-blue-500/5 text-blue-400',
  listing_appointment: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  buyer_consultation: 'from-green-500/20 to-green-500/5 text-green-400',
  seller_consultation: 'from-amber-500/20 to-amber-500/5 text-amber-400',
  market_analysis: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
  property_tour: 'from-teal-500/20 to-teal-500/5 text-teal-400',
  open_house: 'from-pink-500/20 to-pink-500/5 text-pink-400',
  closing: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
  general: 'from-gray-500/20 to-gray-500/5 text-gray-400',
};

const LOCATION_LABELS: Record<string, { icon: typeof Phone; label: string }> = {
  in_person: { icon: Buildings, label: 'In Person' },
  video: { icon: Video, label: 'Video Call' },
  phone: { icon: Phone, label: 'Phone Call' },
};

export function AppointmentTypeCard({
  appointmentType,
  onEdit,
  onDelete,
  compact = false,
}: AppointmentTypeCardProps) {
  const Icon = CATEGORY_ICONS[appointmentType.category] || Clock;
  const colorClass = CATEGORY_COLORS[appointmentType.category] || CATEGORY_COLORS['general'];

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface/80 border border-white/5 rounded-xl hover:border-white/10 transition-all">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <Icon size={20} weight="bold" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-textMain truncate">{appointmentType.name}</h4>
          <p className="text-sm text-textMuted">
            {appointmentType.durationMinutes} min
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 overflow-hidden transition-all hover:border-white/10 group">
      {/* Ambient glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
            <Icon size={24} weight="bold" />
          </div>
          <div>
            <h3 className="font-semibold text-textMain">{appointmentType.name}</h3>
            <div className="flex items-center gap-2 text-sm text-textMuted">
              <Clock size={14} />
              <span>{appointmentType.durationMinutes} minutes</span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <Menu as="div" className="relative opacity-0 group-hover:opacity-100 transition-opacity">
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
            <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right bg-surface border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
              {onEdit && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onEdit}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${
                        active ? 'bg-white/10 text-textMain' : 'text-textMuted'
                      }`}
                    >
                      <PencilSimple size={18} />
                      Edit
                    </button>
                  )}
                </Menu.Item>
              )}
              {onDelete && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onDelete}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm ${
                        active ? 'bg-red-500/20 text-red-400' : 'text-red-400'
                      }`}
                    >
                      <Trash size={18} />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              )}
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Description */}
      {appointmentType.description && (
        <p className="mt-3 text-sm text-textMuted line-clamp-2">
          {appointmentType.description}
        </p>
      )}

      {/* Details */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Default Location */}
        {appointmentType.defaultLocation && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">
            {(() => {
              const loc = LOCATION_LABELS[appointmentType.defaultLocation];
              const LocationIcon = loc?.icon || Phone;
              return (
                <>
                  <LocationIcon size={14} />
                  <span>{loc?.label || appointmentType.defaultLocation}</span>
                </>
              );
            })()}
          </div>
        )}

        {/* Buffer Times */}
        {(appointmentType.bufferBeforeMinutes || appointmentType.bufferAfterMinutes) && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg text-xs text-textMuted">
            <Clock size={14} />
            <span>
              Buffer: {appointmentType.bufferBeforeMinutes || 0}m / {appointmentType.bufferAfterMinutes || 0}m
            </span>
          </div>
        )}

        {/* Requires Confirmation */}
        {appointmentType.requiresConfirmation && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
            <span>Requires Confirmation</span>
          </div>
        )}
      </div>

      {/* Active Status */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-textMuted">
          Category: {appointmentType.category.replace(/_/g, ' ')}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            appointmentType.isActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {appointmentType.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}
