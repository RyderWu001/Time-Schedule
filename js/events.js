/**
 * Calendar Events Modal Controller
 */
import { Store } from './store.js';
import { DateUtils } from './utils.js';

export const EventsController = {
  app: null,
  activeColor: 'blue', // Default selected category color tag

  /**
   * Initializes the controller with the app context
   * @param {Object} appMain 
   */
  init(appMain) {
    this.app = appMain;
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    this.modal = document.getElementById('event-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.form = document.getElementById('event-form');
    this.btnDelete = document.getElementById('btn-delete-event');
    this.colorOptions = document.querySelectorAll('.color-option');
  },

  bindEvents() {
    // 1. Close buttons
    const closeBtns = this.modal.querySelectorAll('.btn-close, .btn-cancel');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    // 2. Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveModal();
    });

    // 3. Delete button
    this.btnDelete.addEventListener('click', () => {
      const eventId = this.form.dataset.eventId;
      if (eventId) {
        if (confirm('確定要刪除此行程嗎？')) {
          Store.deleteEvent(eventId);
          this.closeModal();
          this.app.render(); // Re-render application
        }
      }
    });

    // 4. Color selection indicators
    this.colorOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        this.colorOptions.forEach(c => c.classList.remove('selected'));
        opt.classList.add('selected');
        this.activeColor = opt.dataset.color;
      });
    });
  },

  /**
   * Opens the Create/Edit dialog
   * @param {string} mode 'create' | 'edit'
   * @param {Object|null} eventData Event details if in 'edit' mode, or initial date details if 'create'
   */
  openModal(mode, data = null) {
    this.modal.classList.add('active');
    this.form.reset();
    
    // Default color selection resetting
    this.colorOptions.forEach(c => c.classList.remove('selected'));
    const defaultColorOpt = Array.from(this.colorOptions).find(o => o.dataset.color === 'blue');
    if (defaultColorOpt) defaultColorOpt.classList.add('selected');
    this.activeColor = 'blue';

    if (mode === 'create') {
      this.modalTitle.textContent = '新增行程';
      this.btnDelete.style.display = 'none';
      delete this.form.dataset.eventId;
      
      // Pre-fill initial date-time values
      const now = new Date();
      if (data && data.date) {
        // Form cell clicking pre-fill
        const targetDate = new Date(data.date);
        targetDate.setHours(now.getHours(), 0, 0, 0);
        this.form.elements['startDate'].value = DateUtils.formatDateTimeInput(targetDate);
        
        const endTarget = new Date(targetDate);
        endTarget.setHours(targetDate.getHours() + 1);
        this.form.elements['endDate'].value = DateUtils.formatDateTimeInput(endTarget);
      } else {
        // Header "create" button clicking pre-fill
        now.setMinutes(0, 0, 0);
        this.form.elements['startDate'].value = DateUtils.formatDateTimeInput(now);
        
        const end = new Date(now);
        end.setHours(now.getHours() + 1);
        this.form.elements['endDate'].value = DateUtils.formatDateTimeInput(end);
      }
    } else if (mode === 'edit' && data) {
      this.modalTitle.textContent = '編輯行程';
      this.btnDelete.style.display = 'block';
      this.form.dataset.eventId = data.id;

      // Populate form values
      this.form.elements['title'].value = data.title;
      this.form.elements['startDate'].value = data.startDate;
      this.form.elements['endDate'].value = data.endDate;
      this.form.elements['description'].value = data.description || '';
      
      // Select appropriate color indicator
      this.colorOptions.forEach(c => c.classList.remove('selected'));
      const activeOpt = Array.from(this.colorOptions).find(o => o.dataset.color === data.color);
      if (activeOpt) {
        activeOpt.classList.add('selected');
        this.activeColor = data.color;
      }
    }
  },

  closeModal() {
    this.modal.classList.remove('active');
  },

  saveModal() {
    const titleVal = this.form.elements['title'].value.trim();
    const startVal = this.form.elements['startDate'].value;
    const endVal = this.form.elements['endDate'].value;
    const descVal = this.form.elements['description'].value.trim();

    if (!titleVal) {
      alert('請輸入行程標題！');
      return;
    }

    if (new Date(startVal) >= new Date(endVal)) {
      alert('結束時間必須晚於開始時間！');
      return;
    }

    const eventPayload = {
      title: titleVal,
      startDate: startVal,
      endDate: endVal,
      description: descVal,
      color: this.activeColor,
      isAllDay: false
    };

    const eventId = this.form.dataset.eventId;
    if (eventId) {
      // Edit Mode
      eventPayload.id = eventId;
      Store.updateEvent(eventPayload);
    } else {
      // Create Mode
      Store.addEvent(eventPayload);
    }

    this.closeModal();
    this.app.render(); // Refresh views
  }
};
