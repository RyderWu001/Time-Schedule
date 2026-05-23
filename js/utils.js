/**
 * Calendar Date Utility Functions
 */

export const DateUtils = {
  /**
   * Helper to check if two Date objects represent the same calendar day
   * @param {Date} d1 
   * @param {Date} d2 
   * @returns {boolean}
   */
  isSameDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  },

  /**
   * Helper to format Date to 'YYYY-MM-DD'
   * @param {Date} date 
   * @returns {string}
   */
  formatYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Helper to format Date to 'YYYY-MM-DDTHH:MM' for inputs
   * @param {Date} date 
   * @returns {string}
   */
  formatDateTimeInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  },

  /**
   * Helper to extract time string 'HH:MM' from an ISO date string
   * @param {string} dateStr YYYY-MM-DDTHH:MM
   * @returns {string}
   */
  formatTime(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('T');
    if (parts.length < 2) return '';
    return parts[1].substring(0, 5);
  },

  /**
   * Generates an array of exactly 42 days (6 weeks) representing the grid of a Month view.
   * Includes padding from the preceding and succeeding months.
   * @param {Date} targetDate Reference date inside the month to compute
   * @returns {Array<{date: Date, isCurrentMonth: boolean, isToday: boolean}>}
   */
  getMonthGrid(targetDate) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week for the first day (0 = Sunday, ..., 6 = Saturday)
    const startOffset = firstDay.getDay();
    
    // Total cells required = 42
    const totalCells = 42;
    const gridDays = [];
    
    // Starting date of the grid (may fall in the previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);
    
    const today = new Date();
    
    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      gridDays.push({
        date: cellDate,
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: this.isSameDay(cellDate, today)
      });
    }
    
    return gridDays;
  },

  /**
   * Generates an array of exactly 7 days representing a week (Sunday to Saturday) containing the reference date.
   * @param {Date} targetDate Reference date
   * @returns {Date[]}
   */
  getWeekDays(targetDate) {
    const currentDayOfWeek = targetDate.getDay(); // 0 = Sunday
    const sunday = new Date(targetDate);
    
    // Go backward to Sunday
    sunday.setDate(targetDate.getDate() - currentDayOfWeek);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      weekDays.push(day);
    }
    
    return weekDays;
  }
};
