import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, CalendarBlank } from '@phosphor-icons/react';

interface CalendarPickerProps {
    value?: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarPicker({
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = 'Select date',
    disabled = false,
    className = ''
}: CalendarPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value || new Date());

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const daysInMonth = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysCount = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];
        
        // Add empty slots for days before the first of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add all days of the month
        for (let i = 1; i <= daysCount; i++) {
            days.push(new Date(currentYear, currentMonth, i));
        }
        
        return days;
    }, [currentMonth, currentYear]);

    const navigateMonth = (delta: number) => {
        setViewDate(new Date(currentYear, currentMonth + delta, 1));
    };

    const isDateDisabled = (date: Date) => {
        if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
        if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
        return false;
    };

    const isSelected = (date: Date) => {
        if (!value) return false;
        return date.toDateString() === value.toDateString();
    };

    const isToday = (date: Date) => {
        return date.toDateString() === new Date().toDateString();
    };

    const handleSelect = (date: Date) => {
        if (!isDateDisabled(date)) {
            onChange(date);
            setIsOpen(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={`relative ${className}`}>
            {/* Input Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full flex items-center gap-2 px-3 py-2.5 
                    bg-surface/50 border border-white/10 rounded-xl
                    text-left text-sm transition-all duration-200
                    ${disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }
                    ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}
                `}
            >
                <CalendarBlank size={18} weight="bold" className="text-textMuted" />
                <span className={value ? 'text-textMain' : 'text-textMuted'}>
                    {value ? formatDate(value) : placeholder}
                </span>
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Calendar Panel */}
                    <div className="absolute z-50 mt-2 p-4 bg-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl min-w-[300px]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => navigateMonth(-1)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <CaretLeft size={18} weight="bold" className="text-textMuted" />
                            </button>
                            
                            <h3 className="text-sm font-semibold text-textMain">
                                {MONTHS[currentMonth]} {currentYear}
                            </h3>
                            
                            <button
                                type="button"
                                onClick={() => navigateMonth(1)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <CaretRight size={18} weight="bold" className="text-textMuted" />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS.map(day => (
                                <div 
                                    key={day} 
                                    className="text-center text-xs font-medium text-textMuted py-1"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((date, index) => (
                                <div key={index} className="aspect-square">
                                    {date ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(date)}
                                            disabled={isDateDisabled(date)}
                                            className={`
                                                w-full h-full flex items-center justify-center
                                                text-sm font-medium rounded-lg transition-all duration-200
                                                ${isDateDisabled(date) 
                                                    ? 'text-textMuted/30 cursor-not-allowed' 
                                                    : 'hover:bg-primary/10 hover:text-primary'
                                                }
                                                ${isSelected(date) 
                                                    ? 'bg-primary text-black font-semibold' 
                                                    : ''
                                                }
                                                ${isToday(date) && !isSelected(date) 
                                                    ? 'ring-1 ring-primary/50 text-primary' 
                                                    : ''
                                                }
                                                ${!isSelected(date) && !isToday(date) && !isDateDisabled(date) 
                                                    ? 'text-textMain' 
                                                    : ''
                                                }
                                            `}
                                        >
                                            {date.getDate()}
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(new Date());
                                    setIsOpen(false);
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Date Range Picker
interface DateRangePickerProps {
    startDate?: Date | null;
    endDate?: Date | null;
    onStartChange: (date: Date | null) => void;
    onEndChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    disabled?: boolean;
    className?: string;
}

export function DateRangePicker({
    startDate,
    endDate,
    onStartChange,
    onEndChange,
    minDate,
    maxDate,
    disabled = false,
    className = ''
}: DateRangePickerProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <CalendarPicker
                value={startDate}
                onChange={onStartChange}
                minDate={minDate}
                maxDate={endDate || maxDate}
                placeholder="Start date"
                disabled={disabled}
                className="flex-1"
            />
            <span className="text-textMuted text-sm">to</span>
            <CalendarPicker
                value={endDate}
                onChange={onEndChange}
                minDate={startDate || minDate}
                maxDate={maxDate}
                placeholder="End date"
                disabled={disabled}
                className="flex-1"
            />
        </div>
    );
}

// Day Selector for recurring schedules
interface DaySelectorProps {
    value: number[];  // 0-6, where 0 is Sunday
    onChange: (days: number[]) => void;
    disabled?: boolean;
    className?: string;
}

export function DaySelector({
    value,
    onChange,
    disabled = false,
    className = ''
}: DaySelectorProps) {
    const days = [
        { key: 0, label: 'S', fullLabel: 'Sunday' },
        { key: 1, label: 'M', fullLabel: 'Monday' },
        { key: 2, label: 'T', fullLabel: 'Tuesday' },
        { key: 3, label: 'W', fullLabel: 'Wednesday' },
        { key: 4, label: 'T', fullLabel: 'Thursday' },
        { key: 5, label: 'F', fullLabel: 'Friday' },
        { key: 6, label: 'S', fullLabel: 'Saturday' }
    ];

    const toggleDay = (day: number) => {
        if (disabled) return;
        
        if (value.includes(day)) {
            onChange(value.filter(d => d !== day));
        } else {
            onChange([...value, day].sort());
        }
    };

    return (
        <div className={`flex gap-1.5 ${className}`}>
            {days.map(day => (
                <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    disabled={disabled}
                    title={day.fullLabel}
                    className={`
                        w-9 h-9 flex items-center justify-center
                        text-sm font-semibold rounded-lg transition-all duration-200
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${value.includes(day.key)
                            ? 'bg-primary text-black'
                            : 'bg-surface/50 border border-white/10 text-textMuted hover:border-primary/50 hover:text-primary'
                        }
                    `}
                >
                    {day.label}
                </button>
            ))}
        </div>
    );
}

// Time Picker
interface TimePickerProps {
    value: string;  // HH:MM format
    onChange: (time: string) => void;
    disabled?: boolean;
    className?: string;
    label?: string;
}

export function TimePicker({
    value,
    onChange,
    disabled = false,
    className = '',
    label
}: TimePickerProps) {
    const parts = value.split(':').map(Number);
    const hour = parts[0] !== undefined && !isNaN(parts[0]) ? parts[0] : 9;
    const minute = parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : 0;
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    const formatHour = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        return `${displayHour} ${period}`;
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-medium text-textMuted mb-1.5">
                    {label}
                </label>
            )}
            <div className="flex gap-2">
                <select
                    value={hour}
                    onChange={(e) => onChange(`${e.target.value.padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
                    disabled={disabled}
                    className="flex-1 px-3 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                    {hours.map(h => (
                        <option key={h} value={h}>
                            {formatHour(h)}
                        </option>
                    ))}
                </select>
                <select
                    value={minute}
                    onChange={(e) => onChange(`${hour.toString().padStart(2, '0')}:${e.target.value.padStart(2, '0')}`)}
                    disabled={disabled}
                    className="w-20 px-3 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                    {minutes.map(m => (
                        <option key={m} value={m}>
                            :{m.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

// Time Range Picker
interface TimeRangePickerProps {
    startTime: string;
    endTime: string;
    onStartChange: (time: string) => void;
    onEndChange: (time: string) => void;
    disabled?: boolean;
    className?: string;
}

export function TimeRangePicker({
    startTime,
    endTime,
    onStartChange,
    onEndChange,
    disabled = false,
    className = ''
}: TimeRangePickerProps) {
    return (
        <div className={`flex items-end gap-3 ${className}`}>
            <TimePicker
                value={startTime}
                onChange={onStartChange}
                disabled={disabled}
                label="Start Time"
                className="flex-1"
            />
            <span className="text-textMuted text-sm pb-3">to</span>
            <TimePicker
                value={endTime}
                onChange={onEndChange}
                disabled={disabled}
                label="End Time"
                className="flex-1"
            />
        </div>
    );
}

export default CalendarPicker;
