/**
 * Calendar Views Rendering Engine
 */
import { DateUtils } from './utils.js';

export const Views = {
  // Configurable hour cell height in pixels (must match calendar-views.css)
  HOUR_HEIGHT: 60,

  /**
   * Main router for rendering views based on current state
   * @param {string} view 'month' | 'week' | 'day'
   * @param {Date} date 
   * @param {Object[]} events 
   * @param {HTMLElement} container 
   */
  render(view, date, events, container) {
    container.innerHTML = '';
    
    // Create view pane wrapper for animation transition
    const pane = document.createElement('div');
    pane.className = `view-pane active`;
    
    if (view === 'month') {
      this.renderMonth(date, events, pane);
    } else if (view === 'week') {
      this.renderWeek(date, events, pane);
    } else if (view === 'day') {
      this.renderDay(date, events, pane);
    }
    
    container.appendChild(pane);
  },

  /**
   * Render Month View
   */
  renderMonth(date, events, pane) {
    const monthContainer = document.createElement('div');
    monthContainer.className = 'month-view-container';

    // 1. Weekday headers (Sunday - Saturday)
    const weekdaysHeader = document.createElement('div');
    weekdaysHeader.className = 'month-weekdays';
    const weekdaysText = ['日', '一', '二', '三', '四', '五', '六'];
    
    weekdaysText.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'month-weekday';
      dayEl.textContent = day;
      weekdaysHeader.appendChild(dayEl);
    });
    monthContainer.appendChild(weekdaysHeader);

    // 2. 6x7 Grid of cells
    const monthGrid = document.createElement('div');
    monthGrid.className = 'month-grid';
    
    const gridDays = DateUtils.getMonthGrid(date);
    
    gridDays.forEach(cell => {
      const cellEl = document.createElement('div');
      cellEl.className = `month-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${cell.isToday ? 'today' : ''}`;
      cellEl.dataset.date = DateUtils.formatYYYYMMDD(cell.date);
      
      // Day label
      const dayNum = document.createElement('div');
      dayNum.className = 'month-day-num';
      dayNum.textContent = cell.date.getDate();
      cellEl.appendChild(dayNum);
      
      // Filter events that fall on this day
      const dayEvents = events.filter(e => {
        const start = new Date(e.startDate);
        return DateUtils.isSameDay(start, cell.date);
      });

      // Events container
      const eventsWrapper = document.createElement('div');
      eventsWrapper.className = 'month-events-wrapper';
      
      dayEvents.forEach(evt => {
        const pill = document.createElement('div');
        const isAIPreview = evt.isAIPreview || (evt.id && String(evt.id).startsWith('ai-draft-'));
        pill.className = `event-pill ${evt.color} ${isAIPreview ? 'ai-preview' : ''}`;
        pill.textContent = `${DateUtils.formatTime(evt.startDate)} ${evt.title}`;
        pill.dataset.eventId = evt.id;
        eventsWrapper.appendChild(pill);
      });
      
      cellEl.appendChild(eventsWrapper);
      monthGrid.appendChild(cellEl);
    });
    
    monthContainer.appendChild(monthGrid);
    pane.appendChild(monthContainer);
  },

  /**
   * Render Week View
   */
  renderWeek(date, events, pane) {
    const weekDays = DateUtils.getWeekDays(date);
    
    // 1. Weekly Grid Header (Time Header)
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header week-grid-layout';
    
    // First cell is empty corner above hours column
    const cornerCell = document.createElement('div');
    cornerCell.className = 'timeline-header-cell';
    cornerCell.style.borderRight = '1px solid var(--border-color)';
    timelineHeader.appendChild(cornerCell);
    
    const today = new Date();
    const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    
    weekDays.forEach((day, idx) => {
      const headerCell = document.createElement('div');
      const isToday = DateUtils.isSameDay(day, today);
      headerCell.className = `timeline-header-cell ${isToday ? 'today' : ''}`;
      
      headerCell.innerHTML = `
        <div class="timeline-header-dayname">${dayNames[idx]}</div>
        <div class="timeline-header-daynum">${day.getDate()}</div>
      `;
      timelineHeader.appendChild(headerCell);
    });
    pane.appendChild(timelineHeader);

    // 2. Scrollable Timeline (Hours & Columns Grid)
    const scrollArea = document.createElement('div');
    scrollArea.className = 'timeline-scroll-area';
    
    const timelineGrid = document.createElement('div');
    timelineGrid.className = 'timeline-grid week-grid-layout';
    
    // 2a. Hours Column
    const hoursColumn = document.createElement('div');
    hoursColumn.className = 'hours-column';
    for (let h = 0; h < 24; h++) {
      const hrCell = document.createElement('div');
      hrCell.className = 'hour-cell';
      hrCell.textContent = `${String(h).padStart(2, '0')}:00`;
      hoursColumn.appendChild(hrCell);
    }
    timelineGrid.appendChild(hoursColumn);
    
    // 2b. Add background columns grid for 7 days
    const dayColsContainer = document.createElement('div');
    dayColsContainer.className = 'day-columns-container week-columns-grid';
    
    weekDays.forEach(() => {
      const colBg = document.createElement('div');
      colBg.className = 'day-column-bg';
      dayColsContainer.appendChild(colBg);
    });
    timelineGrid.appendChild(dayColsContainer);

    // 2c. Event Positioning Layer
    const eventsLayer = document.createElement('div');
    eventsLayer.className = 'events-positioning-layer';
    
    // Render timeline event cards
    events.forEach(evt => {
      const evtStart = new Date(evt.startDate);
      const evtEnd = new Date(evt.endDate);
      
      // Check which day of the week this event lands on
      const dayIndex = weekDays.findIndex(day => DateUtils.isSameDay(evtStart, day));
      
      if (dayIndex !== -1) {
        // Calculate vertical position (Top offset and height)
        const startHour = evtStart.getHours();
        const startMin = evtStart.getMinutes();
        const endHour = evtEnd.getHours();
        const endMin = evtEnd.getMinutes();
        
        const topOffset = (startHour + startMin / 60) * this.HOUR_HEIGHT;
        const durationHrs = (evtEnd - evtStart) / (1000 * 60 * 60);
        const heightVal = Math.max(durationHrs * this.HOUR_HEIGHT, 24); // Minimum height of 24px
        
        // Calculate horizontal position (x percentage)
        const leftPercent = (dayIndex * (100 / 7));
        const widthPercent = (100 / 7) - 0.5; // leaving a small visual gap
        
        const card = document.createElement('div');
        const isAIPreview = evt.isAIPreview || (evt.id && String(evt.id).startsWith('ai-draft-'));
        card.className = `event-card ${evt.color} ${isAIPreview ? 'ai-preview' : ''}`;
        card.style.top = `${topOffset}px`;
        card.style.height = `${heightVal}px`;
        card.style.left = `${leftPercent}%`;
        card.style.width = `${widthPercent}%`;
        card.dataset.eventId = evt.id;
        
        card.innerHTML = `
          <div class="event-card-title">${evt.title}</div>
          <div class="event-card-time">${DateUtils.formatTime(evt.startDate)} - ${DateUtils.formatTime(evt.endDate)}</div>
        `;
        
        eventsLayer.appendChild(card);
      }
    });
    
    // Add current time indicator line if today falls in the week
    const todayIndex = weekDays.findIndex(day => DateUtils.isSameDay(today, day));
    if (todayIndex !== -1) {
      const indicator = document.createElement('div');
      indicator.className = 'current-time-indicator';
      
      const updateIndicator = () => {
        const now = new Date();
        const curH = now.getHours();
        const curM = now.getMinutes();
        const topPos = (curH + curM / 60) * this.HOUR_HEIGHT;
        const leftPos = todayIndex * (100 / 7);
        const colWidth = 100 / 7;
        
        indicator.style.top = `${topPos}px`;
        indicator.style.left = `${leftPos}%`;
        indicator.style.width = `${colWidth}%`;
      };
      
      updateIndicator();
      // Keep running updates for live movements
      setInterval(updateIndicator, 60000);
      eventsLayer.appendChild(indicator);
    }
    
    timelineGrid.appendChild(eventsLayer);
    scrollArea.appendChild(timelineGrid);
    pane.appendChild(scrollArea);
    
    // Auto-scroll timeline to 08:00 to keep it visually optimized
    setTimeout(() => {
      scrollArea.scrollTop = 8 * this.HOUR_HEIGHT;
    }, 10);
  },

  /**
   * Render Day View
   */
  renderDay(date, events, pane) {
    // 1. Day Grid Header
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header day-grid-layout';
    
    // Empty corner
    const cornerCell = document.createElement('div');
    cornerCell.className = 'timeline-header-cell';
    cornerCell.style.borderRight = '1px solid var(--border-color)';
    timelineHeader.appendChild(cornerCell);
    
    const today = new Date();
    const isToday = DateUtils.isSameDay(date, today);
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    const headerCell = document.createElement('div');
    headerCell.className = `timeline-header-cell ${isToday ? 'today' : ''}`;
    headerCell.innerHTML = `
      <div class="timeline-header-dayname">${dayNames[date.getDay()]}</div>
      <div class="timeline-header-daynum">${date.getDate()}</div>
    `;
    timelineHeader.appendChild(headerCell);
    pane.appendChild(timelineHeader);

    // 2. Scrollable Timeline Grid
    const scrollArea = document.createElement('div');
    scrollArea.className = 'timeline-scroll-area';
    
    const timelineGrid = document.createElement('div');
    timelineGrid.className = 'timeline-grid day-grid-layout';
    
    // 2a. Hours Column
    const hoursColumn = document.createElement('div');
    hoursColumn.className = 'hours-column';
    for (let h = 0; h < 24; h++) {
      const hrCell = document.createElement('div');
      hrCell.className = 'hour-cell';
      hrCell.textContent = `${String(h).padStart(2, '0')}:00`;
      hoursColumn.appendChild(hrCell);
    }
    timelineGrid.appendChild(hoursColumn);
    
    // 2b. Column Background
    const dayColsContainer = document.createElement('div');
    dayColsContainer.className = 'day-columns-container day-columns-grid';
    const colBg = document.createElement('div');
    colBg.className = 'day-column-bg';
    dayColsContainer.appendChild(colBg);
    timelineGrid.appendChild(dayColsContainer);

    // 2c. Event Layer
    const eventsLayer = document.createElement('div');
    eventsLayer.className = 'events-positioning-layer';
    
    // Filter events for this single day
    const dayEvents = events.filter(e => DateUtils.isSameDay(new Date(e.startDate), date));
    
    dayEvents.forEach(evt => {
      const evtStart = new Date(evt.startDate);
      const evtEnd = new Date(evt.endDate);
      
      const startHour = evtStart.getHours();
      const startMin = evtStart.getMinutes();
      const endHour = evtEnd.getHours();
      const endMin = evtEnd.getMinutes();
      
      const topOffset = (startHour + startMin / 60) * this.HOUR_HEIGHT;
      const durationHrs = (evtEnd - evtStart) / (1000 * 60 * 60);
      const heightVal = Math.max(durationHrs * this.HOUR_HEIGHT, 24);
      
      const card = document.createElement('div');
      const isAIPreview = evt.isAIPreview || (evt.id && String(evt.id).startsWith('ai-draft-'));
      card.className = `event-card ${evt.color} ${isAIPreview ? 'ai-preview' : ''}`;
      card.style.top = `${topOffset}px`;
      card.style.height = `${heightVal}px`;
      card.style.left = '0%';
      card.style.width = '99%';
      card.dataset.eventId = evt.id;
      
      card.innerHTML = `
        <div class="event-card-title" style="font-size:13px;">${evt.title}</div>
        <div class="event-card-time" style="font-size:11px;">${DateUtils.formatTime(evt.startDate)} - ${DateUtils.formatTime(evt.endDate)}</div>
        <div class="event-card-desc" style="font-size:11px; font-weight:400; opacity:0.8; margin-top:2px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${evt.description || '無描述'}</div>
      `;
      
      eventsLayer.appendChild(card);
    });
    
    // Add current time indicator line if active date is today
    if (isToday) {
      const indicator = document.createElement('div');
      indicator.className = 'current-time-indicator';
      
      const updateIndicator = () => {
        const now = new Date();
        const curH = now.getHours();
        const curM = now.getMinutes();
        const topPos = (curH + curM / 60) * this.HOUR_HEIGHT;
        
        indicator.style.top = `${topPos}px`;
        indicator.style.left = '0%';
        indicator.style.width = '100%';
      };
      
      updateIndicator();
      setInterval(updateIndicator, 60000);
      eventsLayer.appendChild(indicator);
    }
    
    timelineGrid.appendChild(eventsLayer);
    scrollArea.appendChild(timelineGrid);
    pane.appendChild(scrollArea);
    
    // Scroll to 08:00
    setTimeout(() => {
      scrollArea.scrollTop = 8 * this.HOUR_HEIGHT;
    }, 10);
  }
};
