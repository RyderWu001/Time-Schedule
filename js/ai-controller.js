/**
 * AI Scheduler Procrastination-Killer Controller
 */
import { Store } from './store.js';
import { DateUtils } from './utils.js';

export const AIController = {
  app: null,
  motivationalTips: [
    "“拖延的本質是焦慮與壓力。AI 正在為您規劃無痛的『起步時段』...”",
    "“大腦在早晨的決策精力最強！已為您將高專注度任務排在上午...”",
    "“運動能產生多巴胺並重啟大腦，已為您安排在下午的體能黃金期...”",
    "“跨出第一步只需兩分鐘，AI 正在為您的日程保留足夠的呼吸緩衝...”",
    "“不用擔心規劃，交給 AI，您只需要專注在下一個兩分鐘的開始...”",
    "“戰勝拖延不需要意志力，需要的是清晰的『微時間區塊』排程...”"
  ],
  tipInterval: null,

  init(appMain) {
    this.app = appMain;
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    this.btnAISchedule = document.getElementById('btn-ai-schedule');
    this.loadingOverlay = document.getElementById('ai-loading-overlay');
    this.loaderText = document.getElementById('ai-loader-text');
    this.aiActionBar = document.getElementById('ai-action-bar');
    
    this.btnConfirmAI = document.getElementById('btn-confirm-ai');
    this.btnCancelAI = document.getElementById('btn-cancel-ai');
    
    // Key Settings Modal
    this.btnSettings = document.getElementById('btn-settings');
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsForm = document.getElementById('settings-form');
  },

  bindEvents() {
    // 1. Trigger AI Scheduling Click
    this.btnAISchedule.addEventListener('click', () => this.startAIScheduling());

    // 2. Draft action bar controls
    this.btnConfirmAI.addEventListener('click', () => this.confirmProposedEvents());
    this.btnCancelAI.addEventListener('click', () => this.cancelProposedEvents());

    // 3. Settings modal trigger
    this.btnSettings.addEventListener('click', () => this.openSettings());
    
    // 4. Settings modal close buttons
    const closeBtns = this.settingsModal.querySelectorAll('.btn-close, .btn-cancel');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeSettings());
    });

    // 5. Settings form submission
    this.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  },

  openSettings() {
    this.settingsModal.classList.add('active');
    this.settingsForm.elements['apiKey'].value = Store.state.openaiConfig.apiKey || '';
    this.settingsForm.elements['apiBase'].value = Store.state.openaiConfig.apiBase || 'https://api.openai.com/v1';
    this.settingsForm.elements['systemPrompt'].value = Store.state.openaiConfig.systemPrompt || '';
  },

  closeSettings() {
    this.settingsModal.classList.remove('active');
  },

  saveSettings() {
    const keyVal = this.settingsForm.elements['apiKey'].value.trim();
    const baseVal = this.settingsForm.elements['apiBase'].value.trim();
    const promptVal = this.settingsForm.elements['systemPrompt'].value.trim();

    Store.state.openaiConfig.apiKey = keyVal;
    Store.state.openaiConfig.apiBase = baseVal || 'https://api.openai.com/v1';
    Store.state.openaiConfig.systemPrompt = promptVal;
    Store.save();
    
    this.closeSettings();
    alert('OpenAI 設定儲存成功！');
  },

  /**
   * Main AI Prompt and API Caller Engine
   */
  async startAIScheduling() {
    const apiKey = Store.state.openaiConfig.apiKey;
    if (!apiKey) {
      alert('請先點選右上角 ⚙️ 設定按鈕，輸入您的 OpenAI API Key 才能開啟 AI 智慧排程功能！');
      this.openSettings();
      return;
    }

    if (Store.state.pendingTasks.length === 0) {
      alert('待辦任務池目前空空如也！請先快速輸入幾項需要排程的彈性任務吧。');
      return;
    }

    // Show Loader Overlay & start changing motivational quotes
    this.showLoader(true);

    try {
      // 1. Gather busy slots (existing events for current week)
      const curDate = Store.state.currentDate;
      const weekDays = DateUtils.getWeekDays(curDate);
      const startOfWeek = weekDays[0];
      const endOfWeek = new Date(weekDays[6]);
      endOfWeek.setHours(23, 59, 59, 999);

      const startISO = startOfWeek.toISOString().substring(0, 10);
      const endISO = endOfWeek.toISOString().substring(0, 10);

      // Extract existing week events (excluding previews)
      const weekEvents = Store.state.events.filter(e => {
        const estart = new Date(e.startDate);
        return estart >= startOfWeek && estart <= endOfWeek;
      });

      const occupiedSlots = weekEvents.map(e => ({
        start: e.startDate,
        end: e.endDate,
        title: e.title
      }));

      // 2. Gather pending tasks
      const pendingTasks = Store.state.pendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        timePreference: t.timePreference,
        color: t.color
      }));

      const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

      // 3. Formulate Prompt context
      const userPromptContext = {
        todayDate: `${curDate.getFullYear()}-${String(curDate.getMonth()+1).padStart(2,'0')}-${String(curDate.getDate()).padStart(2,'0')} (${dayNames[curDate.getDay()]})`,
        weekRange: `${startISO}T00:00 至 ${endISO}T23:59`,
        occupiedSlots: occupiedSlots,
        pendingTasks: pendingTasks
      };

      // 4. Trigger HTTP call to OpenAI Chat Completion API
      const apiURL = `${Store.state.openaiConfig.apiBase}/chat/completions`;
      
      const defaultSystemPrompt = `
你是一位專門幫助「重度拖延症患者」克服規劃癱瘓的時間管理教練。
你的目標是幫使用者將「非固定時間的彈性任務」合理、精準地安插到「本週的空閒時段」中，強迫他們 block 時間專注執行。

請遵循以下排程心理學原則：
1. 認知負荷分配：高專注力任務（如讀書、寫程式、研讀、寫報告）優先安排在早晨至中午（09:00 - 12:00）；體能/動態任務（如運動、清潔、外出）安排在下午（14:00 - 18:00）；輕量/休閒任務安排在傍晚或晚上。
2. 留白與緩衝：任何排程任務前後必須與「已有行程 (occupiedSlots)」至少保留 15-30 分鐘的緩衝時間。
3. 避免過載：每天安排的 AI 彈性任務總時數不得超過 5 小時，單次任務不連續超過 2.5 小時，防止大腦疲勞導致再次拖延。
4. 時間合理性：絕對不要在深夜（22:00 - 08:00）或一般用餐時間（12:00-13:30, 18:00-19:30）排入任何工作任務。

你必須回傳一個嚴格的 JSON 物件，格式如下，不要寫額外的說明文字：
{
  "scheduledEvents": [
    {
      "title": "🤖 [原任務名稱]",
      "startDate": "YYYY-MM-DDTHH:mm",
      "endDate": "YYYY-MM-DDTHH:mm",
      "color": "[傳入的顏色]",
      "description": "AI 建議理由：[請寫一句溫暖、具鼓勵性且解釋為何安排在此時段的心理學說明，字數 30 字內]"
    }
  ]
}
`;

      const systemPrompt = Store.state.openaiConfig.systemPrompt && Store.state.openaiConfig.systemPrompt.trim()
        ? Store.state.openaiConfig.systemPrompt.trim()
        : defaultSystemPrompt;

      const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // High speed and cost efficient
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userPromptContext) }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ? errorData.error.message : 'API 請求失敗');
      }

      const resJson = await response.json();
      const parsedContent = JSON.parse(resJson.choices[0].message.content);

      if (parsedContent && Array.isArray(parsedContent.scheduledEvents)) {
        // 5. Success! Populate proposed events
        const proposed = parsedContent.scheduledEvents.map((evt, idx) => ({
          id: `ai-draft-${Date.now()}-${idx}`,
          title: evt.title,
          startDate: evt.startDate,
          endDate: evt.endDate,
          color: evt.color || 'blue',
          description: evt.description || 'AI 智慧防拖延排程。',
          isAIPreview: true // Mark as preview card
        }));

        this.showLoader(false);
        this.displayAIPreview(proposed);
      } else {
        throw new Error('AI 回傳的格式不正確，未能解析日程。');
      }

    } catch (err) {
      this.showLoader(false);
      alert(`AI 智慧排程失敗：\n${err.message}\n\n請檢查 API Key、網路連接或 API Base 代理設置！`);
    }
  },

  /**
   * Enable/Disable Loader Screen with dynamic quotes
   */
  showLoader(show) {
    if (show) {
      this.loadingOverlay.classList.add('active');
      let index = 0;
      this.loaderText.textContent = this.motivationalTips[0];
      
      this.tipInterval = setInterval(() => {
        index = (index + 1) % this.motivationalTips.length;
        // Smoothly update quote text
        this.loaderText.style.opacity = 0;
        setTimeout(() => {
          this.loaderText.textContent = this.motivationalTips[index];
          this.loaderText.style.opacity = 1;
        }, 300);
      }, 4000);
    } else {
      this.loadingOverlay.classList.remove('active');
      clearInterval(this.tipInterval);
    }
  },

  /**
   * Displays the proposed cards as drafts and slips in the top Action bar
   */
  displayAIPreview(proposedEvents) {
    Store.state.aiPreview.isProposed = true;
    Store.state.aiPreview.proposedEvents = proposedEvents;
    
    // Slide down the top action bar
    this.aiActionBar.classList.add('active');
    
    this.app.render(); // Re-render views showing drafts
  },

  confirmProposedEvents() {
    if (Store.state.aiPreview.proposedEvents.length === 0) return;

    // 1. Copy draft events permanently to store (strip preview tags)
    Store.state.aiPreview.proposedEvents.forEach(draft => {
      const permanentEvent = {
        title: draft.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        color: draft.color,
        description: draft.description,
        isAllDay: false
      };
      Store.addEvent(permanentEvent);
    });

    // 2. Clear task pool
    Store.state.pendingTasks = [];
    Store.save();

    // 3. Dismiss preview state
    this.clearAIPreview();
    
    // 4. Rerender Sidebar Task pool list
    this.app.renderPendingTasksList();

    // 5. Trigger Confetti particles for victory!
    this.triggerConfetti();
  },

  cancelProposedEvents() {
    this.clearAIPreview();
  },

  clearAIPreview() {
    Store.state.aiPreview.isProposed = false;
    Store.state.aiPreview.proposedEvents = [];
    
    this.aiActionBar.classList.remove('active');
    this.app.render(); // Re-render returning to normal
  },

  /**
   * Renders a beautiful particles celebration inside the viewport
   */
  triggerConfetti() {
    // Simple pure CSS/JS Confetti particle burst
    const container = document.body;
    const colors = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];
    
    for (let i = 0; i < 100; i++) {
      const p = document.createElement('div');
      p.style.position = 'fixed';
      p.style.width = `${Math.random() * 8 + 4}px`;
      p.style.height = `${Math.random() * 8 + 4}px`;
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.borderRadius = '50%';
      p.style.zIndex = '9999';
      p.style.left = '50vw';
      p.style.top = '40vh';
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 15 + 5;
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed - 5;
      
      let px = 50;
      let py = 40;
      
      container.appendChild(p);
      
      let age = 0;
      const step = () => {
        px += vx * 0.1;
        py += vy * 0.1;
        vy += 0.5; // gravity
        p.style.left = `${px}vw`;
        p.style.top = `${py}vh`;
        age++;
        if (age < 50) {
          requestAnimationFrame(step);
        } else {
          p.remove();
        }
      };
      requestAnimationFrame(step);
    }
  }
};
