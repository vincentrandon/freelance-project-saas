import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function TaskDatePicker({
  month,
  year,
  availableDates = [], // All dates that can be selected (from Step 2)
  selectedDateSlots = [], // Array of {date, period: 'full'|'morning'|'afternoon'}
  onDateSlotsChange,
  taskName = ''
}) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartSlot, setDragStartSlot] = useState(null);
  const [rangeStart, setRangeStart] = useState(null); // {date, period} for range selection

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Get the first day of the month (0 = Sunday, 1 = Monday, ...)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  // Adjust for Monday being the first day (0 = Mon, 1 = Tue, ...)
  const firstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Get the number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Get previous month's last days to fill the grid
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  // Create calendar grid
  const calendarDays = [];

  // Add previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      isPrevMonth: true,
      date: null,
    });
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      day,
      isCurrentMonth: true,
      isPrevMonth: false,
      date: dateStr,
    });
  }

  // Add next month's leading days to complete the grid
  const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      isPrevMonth: false,
      date: null,
    });
  }

  const isAvailable = (dateStr) => {
    return availableDates.includes(dateStr);
  };

  const isSlotSelected = (dateStr, period) => {
    return selectedDateSlots.some(slot =>
      slot.date === dateStr && (slot.period === period || slot.period === 'full')
    );
  };

  const isInRange = (dateStr, period) => {
    if (!rangeStart) return false;

    const startDate = new Date(rangeStart.date);
    const endDate = new Date(dateStr);
    const currentDate = new Date(dateStr);

    // Check if date is in range
    if (startDate > endDate) {
      if (currentDate >= endDate && currentDate <= startDate) {
        return availableDates.includes(dateStr);
      }
    } else {
      if (currentDate >= startDate && currentDate <= endDate) {
        return availableDates.includes(dateStr);
      }
    }
    return false;
  };

  const handleMouseDown = (dateStr, period, event) => {
    if (!dateStr || !isAvailable(dateStr)) return;

    event.preventDefault();

    // Check if we're completing a range
    if (rangeStart && (rangeStart.date !== dateStr || rangeStart.period !== period)) {
      completeRange(dateStr, period);
      return;
    }

    // Start range or drag selection
    if (event.shiftKey) {
      // Shift+click for range selection
      setRangeStart({ date: dateStr, period });
    } else {
      // Normal click or drag
      setIsDragging(true);
      setDragStartSlot({ date: dateStr, period });
      toggleSlot(dateStr, period);
    }
  };

  const handleMouseEnter = (dateStr, period) => {
    if (!isDragging || !dateStr || !isAvailable(dateStr)) return;

    // Add slot during drag
    addSlot(dateStr, period);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartSlot(null);
  };

  const completeRange = (endDateStr, endPeriod) => {
    if (!rangeStart) return;

    const startDate = new Date(rangeStart.date);
    const endDate = new Date(endDateStr);
    const [firstDate, lastDate] = startDate < endDate ? [startDate, endDate] : [endDate, startDate];

    const newSlots = [...selectedDateSlots];
    const currentDate = new Date(firstDate);

    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (availableDates.includes(dateStr)) {
        // Determine which periods to add
        let periodsToAdd = [];

        if (dateStr === rangeStart.date && dateStr === endDateStr) {
          // Same day - add both periods or merge to full
          if (rangeStart.period !== endPeriod) {
            periodsToAdd = ['full'];
          } else {
            periodsToAdd = [rangeStart.period];
          }
        } else if (dateStr === rangeStart.date) {
          // First day - use start period
          periodsToAdd = [rangeStart.period];
        } else if (dateStr === endDateStr) {
          // Last day - use end period
          periodsToAdd = [endPeriod];
        } else {
          // Middle days - full day
          periodsToAdd = ['full'];
        }

        // Add slots if not already selected
        periodsToAdd.forEach(period => {
          const exists = newSlots.some(s => s.date === dateStr && (s.period === period || s.period === 'full'));
          if (!exists) {
            // Remove any existing slots for this date
            const filtered = newSlots.filter(s => s.date !== dateStr);
            filtered.push({ date: dateStr, period });
            newSlots.length = 0;
            newSlots.push(...filtered);
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    onDateSlotsChange(newSlots);
    setRangeStart(null);
  };

  const toggleSlot = (dateStr, period) => {
    let newSlots = [...selectedDateSlots];

    // Check if this specific slot is selected
    const hasSlot = newSlots.some(s => s.date === dateStr && s.period === period);
    const hasFull = newSlots.some(s => s.date === dateStr && s.period === 'full');

    if (hasFull) {
      // If full day is selected, remove it and add the opposite period
      newSlots = newSlots.filter(s => s.date !== dateStr);
      const oppositePeriod = period === 'morning' ? 'afternoon' : 'morning';
      newSlots.push({ date: dateStr, period: oppositePeriod });
    } else if (hasSlot) {
      // Remove this specific slot
      newSlots = newSlots.filter(s => !(s.date === dateStr && s.period === period));
    } else {
      // Check if opposite period is selected
      const oppositePeriod = period === 'morning' ? 'afternoon' : 'morning';
      const hasOpposite = newSlots.some(s => s.date === dateStr && s.period === oppositePeriod);

      if (hasOpposite) {
        // Both periods selected = full day
        newSlots = newSlots.filter(s => s.date !== dateStr);
        newSlots.push({ date: dateStr, period: 'full' });
      } else {
        // Add this period
        newSlots.push({ date: dateStr, period });
      }
    }

    onDateSlotsChange(newSlots);
  };

  const addSlot = (dateStr, period) => {
    let newSlots = [...selectedDateSlots];

    // Don't add if already exists
    const exists = newSlots.some(s => s.date === dateStr && (s.period === period || s.period === 'full'));
    if (exists) return;

    // Check if opposite period exists
    const oppositePeriod = period === 'morning' ? 'afternoon' : 'morning';
    const hasOpposite = newSlots.some(s => s.date === dateStr && s.period === oppositePeriod);

    if (hasOpposite) {
      // Combine to full day
      newSlots = newSlots.filter(s => s.date !== dateStr);
      newSlots.push({ date: dateStr, period: 'full' });
    } else {
      newSlots.push({ date: dateStr, period });
    }

    onDateSlotsChange(newSlots);
  };

  const totalDays = selectedDateSlots.reduce((sum, slot) => {
    return sum + (slot.period === 'full' ? 1 : 0.5);
  }, 0);

  const selectAllAvailable = () => {
    const newSlots = availableDates.map(date => ({ date, period: 'full' }));
    onDateSlotsChange(newSlots);
    setRangeStart(null);
  };

  const clearAll = () => {
    onDateSlotsChange([]);
    setRangeStart(null);
  };

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Month/Year Header */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-center">
          {taskName && (
            <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
              Dates pour : {taskName}
            </span>
          )}
          {monthNames[month - 1]} {year}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-1">
          {totalDays} {totalDays === 1 ? 'jour' : 'jours'} ({selectedDateSlots.length} {selectedDateSlots.length === 1 ? 'sélection' : 'sélections'})
          {rangeStart && <span className="ml-2 text-indigo-600 dark:text-indigo-400">(sélection en cours...)</span>}
        </p>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-2 justify-center">
          <button
            type="button"
            onClick={selectAllAvailable}
            className="btn-sm bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] py-1 px-2"
          >
            Tout sélectionner
          </button>
          {selectedDateSlots.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="btn-sm border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 text-[10px] py-1 px-2"
            >
              Tout effacer
            </button>
          )}
          {rangeStart && (
            <button
              type="button"
              onClick={() => setRangeStart(null)}
              className="btn-sm bg-red-500 hover:bg-red-600 text-white text-[10px] py-1 px-2"
            >
              Annuler sélection
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day names header */}
        {dayNames.map((dayName, index) => (
          <div
            key={`header-${index}`}
            className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-1"
          >
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((dayObj, index) => {
          const available = dayObj.date && isAvailable(dayObj.date);
          const morningSelected = dayObj.date && isSlotSelected(dayObj.date, 'morning');
          const afternoonSelected = dayObj.date && isSlotSelected(dayObj.date, 'afternoon');
          const inRange = dayObj.date && isInRange(dayObj.date, 'morning');
          const isRangeStartDay = rangeStart && dayObj.date === rangeStart.date;

          return (
            <div
              key={`day-${index}`}
              className={`
                aspect-square rounded-md transition-all duration-150 relative overflow-hidden
                ${!dayObj.isCurrentMonth
                  ? 'bg-transparent'
                  : available
                    ? isRangeStartDay
                      ? 'border-2 border-indigo-500'
                      : inRange
                        ? 'border-2 border-indigo-300 dark:border-indigo-700'
                        : 'border border-gray-300 dark:border-slate-600'
                    : 'bg-gray-100 dark:bg-slate-700 opacity-30'
                }
              `}
            >
              {/* Day number */}
              {dayObj.isCurrentMonth && (
                <div className="absolute top-0 left-0 right-0 text-center text-xs font-medium text-slate-700 dark:text-slate-300 pt-0.5 z-10 pointer-events-none">
                  {dayObj.day}
                </div>
              )}

              {!dayObj.isCurrentMonth && (
                <div className="text-center text-xs text-slate-400 dark:text-slate-600 pt-0.5">
                  {dayObj.day}
                </div>
              )}

              {/* Split day halves - only for available dates */}
              {available && (
                <div className="absolute inset-0 flex" style={{ paddingTop: '16px' }}>
                  {/* Morning half */}
                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(dayObj.date, 'morning', e)}
                    onMouseEnter={() => handleMouseEnter(dayObj.date, 'morning')}
                    className={`
                      flex-1 border-r border-gray-300 dark:border-slate-600 transition-colors cursor-pointer
                      ${morningSelected
                        ? 'bg-indigo-500 hover:bg-indigo-600'
                        : isRangeStartDay && rangeStart.period === 'morning'
                          ? 'bg-indigo-300 dark:bg-indigo-700'
                          : inRange
                            ? 'bg-indigo-100 dark:bg-indigo-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }
                    `}
                    title="Matin - Shift+clic pour sélection de plage"
                  >
                    {morningSelected && (
                      <span className="text-[10px] text-white">AM</span>
                    )}
                  </button>

                  {/* Afternoon half */}
                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(dayObj.date, 'afternoon', e)}
                    onMouseEnter={() => handleMouseEnter(dayObj.date, 'afternoon')}
                    className={`
                      flex-1 transition-colors cursor-pointer
                      ${afternoonSelected
                        ? 'bg-indigo-500 hover:bg-indigo-600'
                        : isRangeStartDay && rangeStart.period === 'afternoon'
                          ? 'bg-indigo-300 dark:bg-indigo-700'
                          : inRange
                            ? 'bg-indigo-100 dark:bg-indigo-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }
                    `}
                    title="Après-midi - Shift+clic pour sélection de plage"
                  >
                    {afternoonSelected && (
                      <span className="text-[10px] text-white">PM</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="text-center mb-2">
          <strong>Sélection :</strong> Shift+clic sur début, puis sur fin pour sélectionner une plage • Glisser pour peindre
        </div>
        <div className="flex items-center justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-50 dark:bg-green-900/20 border border-gray-300 dark:border-slate-600 rounded"></span>
            Disponible
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-indigo-500 rounded"></span>
            Sélectionné
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded"></span>
            Plage
          </span>
        </div>
      </div>
    </div>
  );
}

export default TaskDatePicker;
