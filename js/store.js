/**
 * Calendar State & LocalStorage Store Manager
 */

export const Store = {
  state: {
    currentDate: new Date(),
    currentView: 'month', // 'month' | 'week' | 'day'
    events: [],
    selectedEvent: null,
    activeColors: ['blue', 'emerald', 'rose', 'amber', 'purple'], // Filter by color
    filters: {
      searchQuery: '' // Realtime keyword search
    },
    // AI Procrastination-Killer Task Pool state
    pendingTasks: [],
    aiPreview: {
      isProposed: false,
      proposedEvents: []
    },
    openaiConfig: {
      apiKey: '',
      apiBase: 'https://api.openai.com/v1',
      systemPrompt: ''
    }
  },

  /**
   * Generates sample events relative to the current date so the calendar looks full and impressive
   */
  generateSampleEvents() {
    const today = new Date();
    const format = (d, h, m) => {
      const copy = new Date(d);
      copy.setHours(h, m, 0, 0);
      const y = copy.getFullYear();
      const mo = String(copy.getMonth() + 1).padStart(2, '0');
      const da = String(copy.getDate()).padStart(2, '0');
      const hh = String(copy.getHours()).padStart(2, '0');
      const mm = String(copy.getMinutes()).padStart(2, '0');
      return `${y}-${mo}-${da}T${hh}:${mm}`;
    };

    const d1 = new Date(today); // Today
    const d2 = new Date(today);
    d2.setDate(today.getDate() - 1); // Yesterday
    const d3 = new Date(today);
    d3.setDate(today.getDate() + 1); // Tomorrow
    const d4 = new Date(today);
    d4.setDate(today.getDate() + 2); // In two days
    const d5 = new Date(today);
    d5.setDate(today.getDate() - 3); // Three days ago

    return [
      {
        id: 'sample-1',
        title: '🤖 系統架構設計評審會',
        description: '討論與評估行事曆系統在 iOS 上的 Web App 套殼架構 (Capacitor/WKWebView) 與安全區域適配。',
        startDate: format(d1, 10, 0),
        endDate: format(d1, 12, 0),
        color: 'blue',
        isAllDay: false
      },
      {
        id: 'sample-2',
        title: '🏋️ 健身房重量訓練 (胸與三頭)',
        description: '包含臥推、啞鈴飛鳥及滑輪下壓，保持每週規律健身習慣。',
        startDate: format(d1, 18, 30),
        endDate: format(d1, 20, 0),
        color: 'emerald',
        isAllDay: false
      },
      {
        id: 'sample-3',
        title: '✈️ 規劃日本京都暑期家族旅遊',
        description: '預訂機票、精選清水寺與嵐山周邊的溫泉旅館，並排定清水舞台與金閣寺路線。',
        startDate: format(d3, 9, 0),
        endDate: format(d3, 11, 30),
        color: 'purple',
        isAllDay: false
      },
      {
        id: 'sample-4',
        title: '☕ 與資深產品經理交流 UI 改版',
        description: '在星巴克碰面，評估毛玻璃風格與深色模式在行動端的使用者留存率影響。',
        startDate: format(d2, 14, 0),
        endDate: format(d2, 15, 30),
        color: 'amber',
        isAllDay: false
      },
      {
        id: 'sample-5',
        title: '🚨 重要產品線上 Bug 搶修會議',
        description: '修正部分舊款 iPhone 在 Safari 下點擊按鈕的彈出延遲問題。',
        startDate: format(d5, 16, 0),
        endDate: format(d5, 17, 30),
        color: 'rose',
        isAllDay: false
      },
      {
        id: 'sample-6',
        title: '🎨 iOS 設計規範自主學習',
        description: '研讀 Apple Human Interface Guidelines 關於安全間距 (Safe Areas) 與側邊滑動手勢的規範。',
        startDate: format(d4, 13, 0),
        endDate: format(d4, 15, 0),
        color: 'blue',
        isAllDay: false
      }
    ];
  },

  /**
   * Initializes store and loads from LocalStorage
   */
  init() {
    // 1. Load Calendar Events
    const rawEvents = localStorage.getItem('time_schedule_events');
    if (rawEvents) {
      try {
        this.state.events = JSON.parse(rawEvents);
      } catch (e) {
        console.error('Failed to parse calendar events, fallback to samples.', e);
        this.state.events = this.generateSampleEvents();
        this.save();
      }
    } else {
      this.state.events = this.generateSampleEvents();
      this.save();
    }

    // 2. Load Pending Tasks for Procrastination-Killer Pool
    const rawPending = localStorage.getItem('time_schedule_pending_tasks');
    if (rawPending) {
      try {
        this.state.pendingTasks = JSON.parse(rawPending);
      } catch (e) {
        this.state.pendingTasks = this.generateSamplePendingTasks();
        this.save();
      }
    } else {
      this.state.pendingTasks = this.generateSamplePendingTasks();
      this.save();
    }

    // 3. Load OpenAI configurations
    const rawConfig = localStorage.getItem('time_schedule_openai_config');
    if (rawConfig) {
      try {
        this.state.openaiConfig = JSON.parse(rawConfig);
      } catch (e) {}
    }
  },

  /**
   * Generates sample pending tasks relative to first load
   */
  generateSamplePendingTasks() {
    return [
      {
        id: 'pending-sample-1',
        title: '📚 研讀神經科學與行為心理學書籍',
        duration: 2.0,
        timePreference: 'morning',
        color: 'blue',
        description: '學習大腦精力分配規律，做讀書摘錄。'
      },
      {
        id: 'pending-sample-2',
        title: '🏃 健身房有氧慢跑 5 公里',
        duration: 1.0,
        timePreference: 'afternoon',
        color: 'emerald',
        description: '維持大腦多巴胺分泌，打敗疲憊！'
      },
      {
        id: 'pending-sample-3',
        title: '🧹 房間大掃除與書桌收納',
        duration: 1.5,
        timePreference: 'evening',
        color: 'amber',
        description: '清除環境雜亂，還給大腦高度專注空間。'
      }
    ];
  },

  /**
   * Saves current events state to LocalStorage
   */
  save() {
    localStorage.setItem('time_schedule_events', JSON.stringify(this.state.events));
    localStorage.setItem('time_schedule_pending_tasks', JSON.stringify(this.state.pendingTasks));
    localStorage.setItem('time_schedule_openai_config', JSON.stringify(this.state.openaiConfig));
  },

  /**
   * Adds a new event
   * @param {Object} event 
   */
  addEvent(event) {
    event.id = 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    this.state.events.push(event);
    this.save();
    return event;
  },

  /**
   * Updates an existing event
   * @param {Object} updatedEvent 
   */
  updateEvent(updatedEvent) {
    const idx = this.state.events.findIndex(e => e.id === updatedEvent.id);
    if (idx !== -1) {
      this.state.events[idx] = updatedEvent;
      this.save();
      return true;
    }
    return false;
  },

  /**
   * Deletes an event by ID
   * @param {string} id 
   */
  deleteEvent(id) {
    this.state.events = this.state.events.filter(e => e.id !== id);
    this.save();
  },

  /**
   * Adds a new pending task to the pool
   * @param {Object} task 
   */
  addPendingTask(task) {
    task.id = 'pending-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    this.state.pendingTasks.push(task);
    this.save();
    return task;
  },

  /**
   * Deletes a pending task by ID from the pool
   * @param {string} id 
   */
  deletePendingTask(id) {
    this.state.pendingTasks = this.state.pendingTasks.filter(t => t.id !== id);
    this.save();
  },

  /**
   * Returns all active events, filtered by color selection and search keyword queries, merging AI preview drafts if active
   * @returns {Object[]}
   */
  getFilteredEvents() {
    const query = (this.state.filters && this.state.filters.searchQuery || '').toLowerCase().trim();
    
    // Combine regular events with proposed AI draft events if currently previewing
    let list = [...this.state.events];
    if (this.state.aiPreview && this.state.aiPreview.isProposed) {
      list = [...list, ...this.state.aiPreview.proposedEvents];
    }
    
    return list.filter(e => {
      const colorMatch = this.state.activeColors.includes(e.color);
      const titleMatch = e.title.toLowerCase().includes(query);
      const descMatch = (e.description || '').toLowerCase().includes(query);
      return colorMatch && (titleMatch || descMatch);
    });
  }
};
