/**
 * Main Application Orchestrator
 */
import { Store } from './store.js';
import { DateUtils } from './utils.js';
import { Views } from './views.js';
import { EventsController } from './events.js';
import { AIController } from './ai-controller.js';

const App = {
  /**
   * Application Bootstrapper
   */
  init() {
    this.isForceMobile = false;
    this.selectedPendingColor = 'blue';

    // 1. Initialize State Storage
    Store.init();

    // 2. Query core HTML elements
    this.cacheDOM();

    // 3. Bind UI interactions
    this.bindEvents();

    // 4. Initialize Modal Controller
    EventsController.init(this);

    // 5. Setup responsive modes
    window.addEventListener('resize', () => this.updateResponsiveMode());
    this.updateResponsiveMode();

    // 5b. Initialize AI Procrastination-Killer controller
    AIController.init(this);

    // 6. Initial Draw
    this.render();
  },

  cacheDOM() {
    this.navTitle = document.getElementById('nav-title');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnToday = document.getElementById('btn-today');

    this.btnCreateEvent = document.getElementById('btn-create-event');
    this.viewContainer = document.getElementById('view-container');

    // Switchers
    this.switcherTabs = document.querySelectorAll('.switcher-tab');

    // Sidebar Mini Calendar
    this.miniCalHeader = document.getElementById('mini-cal-header-title');
    this.miniCalPrev = document.getElementById('mini-cal-prev');
    this.miniCalNext = document.getElementById('mini-cal-next');
    this.miniCalGrid = document.getElementById('mini-cal-grid-days');

    // Filters
    this.filterItems = document.querySelectorAll('.filter-item');

    // Mobile DOM elements
    this.btnMenu = document.getElementById('btn-menu');
    this.btnQuickAdd = document.getElementById('btn-quick-add');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.sidebar = document.querySelector('.sidebar');

    // Advanced Desktop elements
    this.searchInput = document.getElementById('search-input');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.btnExport = document.getElementById('btn-export');
    this.importFileInput = document.getElementById('import-file-input');
    this.upcomingList = document.getElementById('upcoming-list');
    
    // Collapsible Sidebar Toggles
    this.toggleFilters = document.getElementById('toggle-filters');
    this.toggleAgenda = document.getElementById('toggle-agenda');
    
    // AI Pending Tasks Elements
    this.togglePendingPool = document.getElementById('toggle-pending-pool');
    this.pendingTaskForm = document.getElementById('pending-task-form');
    this.pendingTitleInput = document.getElementById('pending-title-input');
    this.pendingDurationSelect = document.getElementById('pending-duration-select');
    this.pendingPreferenceSelect = document.getElementById('pending-preference-select');
    this.pendingColorOptions = document.querySelectorAll('.pending-color-option');
    this.pendingTasksList = document.getElementById('pending-tasks-list');

    // We will keep a local state inside App for the sidebar mini-calendar focus month
    this.miniCalDate = new Date(Store.state.currentDate);
  },

  bindEvents() {
    // 1. Prev / Next Navigation buttons
    this.btnPrev.addEventListener('click', () => this.navigateDate(-1));
    this.btnNext.addEventListener('click', () => this.navigateDate(1));
    this.btnToday.addEventListener('click', () => {
      Store.state.currentDate = new Date();
      this.miniCalDate = new Date(Store.state.currentDate);
      this.render();
    });

    // 2. Add New event button
    this.btnCreateEvent.addEventListener('click', () => {
      EventsController.openModal('create');
    });

    // Mobile Drawer sidebar bindings
    this.btnMenu.addEventListener('click', () => this.toggleSidebar(true));
    this.btnQuickAdd.addEventListener('click', () => {
      EventsController.openModal('create');
    });
    this.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));

    // Dynamic Real-time Keyword Search
    this.searchInput.addEventListener('input', (e) => {
      Store.state.filters.searchQuery = e.target.value;
      this.render(); // Dynamically re-render with matching events
    });

    // Light / Dark Theme Manual Toggle Controller
    this.btnThemeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      if (root.classList.contains('dark-theme')) {
        root.classList.remove('dark-theme');
        root.classList.add('light-theme');
      } else if (root.classList.contains('light-theme')) {
        root.classList.remove('light-theme');
        root.classList.add('dark-theme');
      } else {
        // Fallback checks against system preference defaults
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('light-theme');
        } else {
          root.classList.add('dark-theme');
        }
      }
    });

    // Calendar JSON Data Export Backup
    this.btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Store.state.events, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "calendar_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Calendar JSON Data Import Backup Merger
    this.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            if (confirm(`確定要匯入並合併 ${imported.length} 個日程事件嗎？`)) {
              imported.forEach(impEvt => {
                if (!impEvt.id) impEvt.id = 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const existingIdx = Store.state.events.findIndex(e => e.id === impEvt.id);
                if (existingIdx !== -1) {
                  Store.state.events[existingIdx] = impEvt;
                } else {
                  Store.state.events.push(impEvt);
                }
              });
              Store.save();
              this.render();
              alert('行程匯入並合併成功！');
            }
          } else {
            alert('匯入失敗：選取的檔案內容並非有效的日程陣列格式。');
          }
        } catch (err) {
          alert('解析檔案失敗，請確保選取正確的 .json 備份檔。');
        }
        e.target.value = ''; // Reset input selection
      };
      reader.readAsText(file);
    });

    // 3. Month/Week/Day Switcher Tabs
    this.switcherTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switcherTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        Store.state.currentView = tab.dataset.view;
        this.render();
      });
    });

    // 4. Sidebar Mini-Calendar Prev / Next Arrows
    this.miniCalPrev.addEventListener('click', () => this.navigateMiniCal(-1));
    this.miniCalNext.addEventListener('click', () => this.navigateMiniCal(1));

    // 5. Sidebar Color Category Filter Items
    this.filterItems.forEach(item => {
      const color = item.dataset.color;
      // Pre-fill CSS Custom variable color tag for checkmark box
      item.style.setProperty('--color-active', `var(--color-${color})`);

      item.addEventListener('click', () => {
        const isActive = item.classList.toggle('active');

        if (isActive) {
          if (!Store.state.activeColors.includes(color)) {
            Store.state.activeColors.push(color);
          }
        } else {
          Store.state.activeColors = Store.state.activeColors.filter(c => c !== color);
        }

        this.render(); // Re-render showing active categories only
      });
    });

    // 6. Dynamic Calendar click interception for creating or editing events
    this.viewContainer.addEventListener('click', (e) => {
      // Check if user clicked an event card or event pill
      const eventTarget = e.target.closest('.event-pill, .event-card');
      if (eventTarget) {
        const eventId = eventTarget.dataset.eventId;
        const eventData = Store.state.events.find(evt => evt.id === eventId);
        if (eventData) {
          EventsController.openModal('edit', eventData);
        }
        return;
      }

      // Check if user clicked a cell in Month View to switch to Day Mode
      const cellTarget = e.target.closest('.month-cell');
      if (cellTarget) {
        const cellDate = cellTarget.dataset.date;
        const targetDate = new Date(cellDate + 'T00:00:00');
        
        // 1. Update State Date & View
        Store.state.currentDate = targetDate;
        this.miniCalDate = new Date(targetDate);
        Store.state.currentView = 'day';
        
        // 2. Sync switcher tab active classes (Month -> Day)
        this.switcherTabs.forEach(tab => {
          if (tab.dataset.view === 'day') {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
        
        // 3. Re-render views
        this.render();
      }
    });

    // 8. Collapsible Sidebar Accordions
    this.toggleFilters.addEventListener('click', () => {
      this.toggleFilters.classList.toggle('collapsed');
    });
    this.toggleAgenda.addEventListener('click', () => {
      this.toggleAgenda.classList.toggle('collapsed');
    });
    if (this.togglePendingPool) {
      this.togglePendingPool.addEventListener('click', () => {
        this.togglePendingPool.classList.toggle('collapsed');
      });
    }

    // 9. AI Pending Tasks form handlers
    this.pendingColorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        this.pendingColorOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedPendingColor = opt.dataset.color;
      });
    });

    if (this.pendingTaskForm) {
      this.pendingTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = this.pendingTitleInput.value.trim();
        const duration = parseFloat(this.pendingDurationSelect.value);
        const timePreference = this.pendingPreferenceSelect.value;
        const color = this.selectedPendingColor || 'blue';
        
        if (!title) return;
        
        Store.addPendingTask({
          title,
          duration,
          timePreference,
          color,
          description: `AI 待安排任務 (${duration} 小時，偏好：${
            timePreference === 'any' ? '隨意' : timePreference === 'morning' ? '早上' : timePreference === 'afternoon' ? '下午' : '晚上'
          })`
        });
        
        // Reset inputs
        this.pendingTitleInput.value = '';
        this.pendingDurationSelect.value = '1';
        this.pendingPreferenceSelect.value = 'any';
        
        // Reset active color option to blue
        this.pendingColorOptions.forEach(o => o.classList.remove('selected'));
        const defaultColorOpt = Array.from(this.pendingColorOptions).find(o => o.dataset.color === 'blue');
        if (defaultColorOpt) defaultColorOpt.classList.add('selected');
        this.selectedPendingColor = 'blue';
        
        this.renderPendingTasksList();
      });
    }

    // 7. Command + F (Mac) / Ctrl + F (Windows) keyboard shortcut to toggle phone simulator mode
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
        e.preventDefault(); // Intercept browser page search bar
        
        this.isForceMobile = !this.isForceMobile;
        this.updateResponsiveMode();
        this.render(); // Re-render in mobile simulator viewport mode
      }
    });
  },

  /**
   * Toggles the sidebar open/closed drawer state on mobile viewports
   * @param {boolean} open 
   */
  toggleSidebar(open) {
    if (open) {
      this.sidebar.classList.add('open');
      this.sidebarOverlay.classList.add('active');
    } else {
      this.sidebar.classList.remove('open');
      this.sidebarOverlay.classList.remove('active');
    }
  },

  /**
   * Updates CSS responsive mode classes on document body
   */
  updateResponsiveMode() {
    const isSmallScreen = window.innerWidth <= 768;
    const isMobileMode = isSmallScreen || this.isForceMobile;
    
    if (isMobileMode) {
      document.body.classList.add('mobile-mode');
    } else {
      document.body.classList.remove('mobile-mode');
    }
    
    if (this.isForceMobile) {
      document.body.classList.add('force-mobile-active');
    } else {
      document.body.classList.remove('force-mobile-active');
    }
  },

  /**
   * Navigate main date viewport by direction (offset +/- 1)
   * @param {number} dir -1 or 1
   */
  navigateDate(dir) {
    const curDate = Store.state.currentDate;
    const view = Store.state.currentView;

    if (view === 'month') {
      curDate.setMonth(curDate.getMonth() + dir);
    } else if (view === 'week') {
      curDate.setDate(curDate.getDate() + dir * 7);
    } else if (view === 'day') {
      curDate.setDate(curDate.getDate() + dir);
    }

    this.miniCalDate = new Date(curDate); // Keep mini-cal aligned
    this.render();
  },

  /**
   * Navigate mini-calendar display month
   * @param {number} dir -1 or 1
   */
  navigateMiniCal(dir) {
    this.miniCalDate.setMonth(this.miniCalDate.getMonth() + dir);
    this.renderMiniCalendar();
  },

  /**
   * Dynamically formats and sets top header text range
   */
  updateHeaderTitle() {
    const date = Store.state.currentDate;
    const view = Store.state.currentView;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (view === 'month') {
      this.navTitle.textContent = `${year}年 ${month}月`;
    } else if (view === 'week') {
      const weekDays = DateUtils.getWeekDays(date);
      const start = weekDays[0];
      const end = weekDays[6];

      const startText = `${start.getFullYear()}年 ${start.getMonth() + 1}月${start.getDate()}日`;
      const endText = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
        ? `${end.getDate()}日`
        : `${end.getFullYear() === start.getFullYear() ? '' : end.getFullYear() + '年 '}${end.getMonth() + 1}月${end.getDate()}日`;

      this.navTitle.textContent = `${startText} - ${endText}`;
    } else if (view === 'day') {
      const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      this.navTitle.textContent = `${year}年 ${month}月${date.getDate()}日 (${dayNames[date.getDay()]})`;
    }
  },

  /**
   * Render Sidebar Mini Calendar
   */
  renderMiniCalendar() {
    const year = this.miniCalDate.getFullYear();
    const month = this.miniCalDate.getMonth();

    // Set text (e.g. "2026年 5月")
    this.miniCalHeader.textContent = `${year}年 ${month + 1}月`;

    this.miniCalGrid.innerHTML = '';

    // Add grid days
    const gridDays = DateUtils.getMonthGrid(this.miniCalDate);

    gridDays.forEach(cell => {
      const dayEl = document.createElement('div');
      const isFocused = DateUtils.isSameDay(cell.date, Store.state.currentDate);

      dayEl.className = `mini-cal-day ${cell.isCurrentMonth ? '' : 'other-month'} ${isFocused ? 'active' : ''}`;
      dayEl.textContent = cell.date.getDate();

      dayEl.addEventListener('click', () => {
        Store.state.currentDate = new Date(cell.date);
        this.miniCalDate = new Date(cell.date);
        this.render();

        // Auto-close sidebar on mobile after choosing a date
        if (window.innerWidth <= 768) {
          this.toggleSidebar(false);
        }
      });

      this.miniCalGrid.appendChild(dayEl);
    });
  },

  /**
   * Render sidebar agenda list with top 5 upcoming events
   */
  renderUpcomingAgenda() {
    this.upcomingList.innerHTML = '';
    
    const now = new Date();
    // Filter events which haven't ended yet
    const futureEvents = Store.state.events.filter(e => {
      return new Date(e.endDate) >= now;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    const topEvents = futureEvents.slice(0, 5);
    
    if (topEvents.length === 0) {
      this.upcomingList.innerHTML = '<div class="upcoming-empty">暫無近期日程</div>';
      return;
    }
    
    topEvents.forEach(evt => {
      const item = document.createElement('div');
      item.className = `upcoming-item ${evt.color}`;
      item.dataset.eventId = evt.id;
      
      const startDate = new Date(evt.startDate);
      const dateText = `${startDate.getMonth() + 1}/${startDate.getDate()} ${DateUtils.formatTime(evt.startDate)}`;
      
      item.innerHTML = `
        <div class="upcoming-item-title">${evt.title}</div>
        <div class="upcoming-item-time">${dateText}</div>
      `;
      
      item.addEventListener('click', () => {
        EventsController.openModal('edit', evt);
      });
      
      this.upcomingList.appendChild(item);
    });
  },

  /**
   * Main Render Pipeline
   */
  /**
   * Render sidebar AI pending tasks pool list
   */
  renderPendingTasksList() {
    if (!this.pendingTasksList) return;
    
    this.pendingTasksList.innerHTML = '';
    const pendings = Store.state.pendingTasks;
    
    if (pendings.length === 0) {
      this.pendingTasksList.innerHTML = '<div class="upcoming-empty" style="padding: 12px 0;">暫無待安排彈性任務</div>';
      return;
    }
    
    const prefTexts = {
      any: '隨意時段',
      morning: '偏好早上',
      afternoon: '偏好下午',
      evening: '偏好晚上'
    };
    
    pendings.forEach(task => {
      const card = document.createElement('div');
      card.className = `pending-card ${task.color}`;
      
      card.innerHTML = `
        <div class="pending-card-header">
          <span class="pending-card-title" title="${task.title}">${task.title}</span>
          <button class="pending-card-delete" data-task-id="${task.id}" title="刪除任務">&times;</button>
        </div>
        <div class="pending-card-meta">
          <span class="pending-card-badge">${task.duration} 小時</span>
          <span class="pending-card-badge">${prefTexts[task.timePreference] || task.timePreference}</span>
        </div>
      `;
      
      // Bind delete action
      const deleteBtn = card.querySelector('.pending-card-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card clicks
        Store.deletePendingTask(task.id);
        this.renderPendingTasksList();
      });
      
      this.pendingTasksList.appendChild(card);
    });
  },

  /**
   * Main Render Pipeline
   */
  render() {
    // 1. Update Title Range
    this.updateHeaderTitle();

    // 2. Render Sidebar Mini-Calendar
    this.renderMiniCalendar();

    // 3. Render Sidebar Upcoming Agenda
    this.renderUpcomingAgenda();

    // 3b. Render Sidebar Pending Tasks Pool
    this.renderPendingTasksList();

    // 4. Filter and render active calendar content view
    const filteredEvents = Store.getFilteredEvents();
    Views.render(
      Store.state.currentView,
      Store.state.currentDate,
      filteredEvents,
      this.viewContainer
    );
  }
};

// Start application when DOM is fully prepared
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
