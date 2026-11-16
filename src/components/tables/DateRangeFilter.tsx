import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export const isWithinDateRange = (value: string | undefined, startDate: string, endDate: string): boolean => {
  if (!startDate && !endDate) return true;
  if (!value) return false;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    if (day < start) return false;
  }
  if (endDate) {
    const end = new Date(`${endDate}T00:00:00`).getTime();
    if (day > end) return false;
  }
  return true;
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <label className="text-[11px] text-neutral-500 whitespace-nowrap">From
      <input aria-label="Filter from date" type="date" value={startDate} max={endDate || undefined} onChange={(e) => onStartDateChange(e.target.value)} className="ml-1 text-xs border border-neutral-300 rounded px-2 py-1.5 bg-white text-neutral-800" />
    </label>
    <label className="text-[11px] text-neutral-500 whitespace-nowrap">To
      <input aria-label="Filter to date" type="date" value={endDate} min={startDate || undefined} onChange={(e) => onEndDateChange(e.target.value)} className="ml-1 text-xs border border-neutral-300 rounded px-2 py-1.5 bg-white text-neutral-800" />
    </label>
  </div>
);
