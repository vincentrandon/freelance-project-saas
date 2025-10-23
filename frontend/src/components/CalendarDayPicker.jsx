import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function CalendarDayPicker({ month, year, selectedDates = [], onDatesChange }) {
  const { t } = useTranslation();
  const [rangeStart, setRangeStart] = useState(null);

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

  const isToday = (dateStr) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const isSelected = (dateStr) => {
    return selectedDates.includes(dateStr);
  };

  const isWeekend = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const isInRange = (dateStr) => {
    if (!rangeStart || rangeStart === dateStr) return false;
    const start = new Date(rangeStart);
    const end = new Date(dateStr);
    const current = new Date(dateStr);

    if (start > end) {
      return current > end && current < start;
    }
    return current > start && current < end;
  };

  const handleDayClick = (dateStr) => {
    if (!dateStr) return; // Ignore clicks on other month days

    // Range selection logic
    if (rangeStart && rangeStart !== dateStr) {
      // Complete the range
      const start = new Date(rangeStart);
      const end = new Date(dateStr);
      const [firstDate, lastDate] = start < end ? [start, end] : [end, start];

      // Get all dates in range (excluding weekends)
      const datesInRange = [];
      const currentDate = new Date(firstDate);

      while (currentDate <= lastDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        // Only add working days (Monday-Friday)
        if (!isWeekend(dateStr)) {
          datesInRange.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Merge with existing selections
      const newSelectedDates = [...new Set([...selectedDates, ...datesInRange])];
      newSelectedDates.sort();
      onDatesChange(newSelectedDates);

      setRangeStart(null);
    } else {
      // Start a new range or toggle single date
      if (isSelected(dateStr)) {
        // Deselect the date
        const newSelectedDates = selectedDates.filter(d => d !== dateStr);
        onDatesChange(newSelectedDates);
        setRangeStart(null);
      } else {
        // Start range selection
        setRangeStart(dateStr);
      }
    }
  };

  const selectAllWorkingDays = () => {
    const allWorkingDays = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!isWeekend(dateStr)) {
        allWorkingDays.push(dateStr);
      }
    }

    allWorkingDays.sort();
    onDatesChange(allWorkingDays);
    setRangeStart(null);
  };

  const clearAllDates = () => {
    onDatesChange([]);
    setRangeStart(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
      {/* Month/Year Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 text-center">
          {monthNames[month - 1]} {year}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-1">
          {selectedDates.length} {selectedDates.length === 1 ? 'jour sélectionné' : 'jours sélectionnés'}
          {rangeStart && <span className="ml-2 text-indigo-600 dark:text-indigo-400">(sélection en cours...)</span>}
        </p>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-3 justify-center">
          <button
            type="button"
            onClick={selectAllWorkingDays}
            className="btn-sm bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Tous les jours ouvrés
          </button>
          {selectedDates.length > 0 && (
            <button
              type="button"
              onClick={clearAllDates}
              className="btn-sm border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Tout effacer
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
            className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-2"
          >
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((dayObj, index) => {
          const selected = dayObj.date && isSelected(dayObj.date);
          const today = dayObj.date && isToday(dayObj.date);
          const weekend = dayObj.date && isWeekend(dayObj.date);
          const inRange = dayObj.date && isInRange(dayObj.date) && !weekend;
          const isRangeStart = dayObj.date === rangeStart;

          return (
            <button
              key={`day-${index}`}
              type="button"
              onClick={() => handleDayClick(dayObj.date)}
              disabled={!dayObj.isCurrentMonth}
              className={`
                aspect-square p-2 text-sm rounded-lg transition-all duration-150 relative
                ${!dayObj.isCurrentMonth
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'cursor-pointer'
                }
                ${selected
                  ? 'bg-indigo-500 text-white font-semibold hover:bg-indigo-600'
                  : isRangeStart
                    ? 'bg-indigo-300 dark:bg-indigo-700 text-white font-semibold border-2 border-indigo-500'
                    : inRange
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 border border-indigo-300 dark:border-indigo-700'
                      : weekend && dayObj.isCurrentMonth
                        ? 'bg-gray-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-gray-200 dark:border-slate-600'
                        : dayObj.isCurrentMonth
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'
                          : ''
                }
                ${today && !selected
                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400'
                  : ''
                }
              `}
            >
              {dayObj.day}
              {weekend && dayObj.isCurrentMonth && !selected && (
                <span className="absolute bottom-0 right-0 text-[8px] text-slate-400">⌛</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="text-center mb-2">
          <strong>Sélection rapide :</strong> Cliquez sur le premier jour, puis sur le dernier jour pour sélectionner une période
        </div>
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-indigo-500 rounded"></span>
            Sélectionné
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded"></span>
            Dans la plage
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded"></span>
            Week-end ⌛
          </span>
        </div>
      </div>
    </div>
  );
}

export default CalendarDayPicker;
