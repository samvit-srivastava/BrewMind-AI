/* -------------------------------------------------------------
 * BREWMIND AI - AI Operations Copilot Drawer
 * ------------------------------------------------------------- */

import { memory } from './memory.js';
import { soundEffects } from './utils.js';
import { simulation } from './simulation.js';

class AICopilot {
  constructor() {
    this.drawer = null;
    this.chatHistoryContainer = null;
    this.userInputField = null;
    this.voiceBtn = null;
    this.sendBtn = null;
    this.isDrawerOpen = false;
    this.isListening = false;
    this.recognition = null;
    this.detectedLocalModel = null;
  }

  /**
   * Initializes drawer elements and listeners.
   */
  init() {
    this.drawer = document.getElementById('copilot-drawer');
    this.chatHistoryContainer = document.getElementById('copilot-chat-history');
    this.userInputField = document.getElementById('copilot-user-input');
    this.voiceBtn = document.getElementById('btn-copilot-voice');
    this.sendBtn = document.getElementById('btn-copilot-send');

    if (!this.drawer) return;

    this.bindEvents();
    this.setupSpeechRecognition();
    this.setupCardDelegation();
    this.checkLocalAIStatus();
    
    // Check local AI status periodically (every 30s to reduce console noise)
    setInterval(() => this.checkLocalAIStatus(), 30000);

    // Global Cmd+K / Ctrl+K listener to toggle command center drawer
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        soundEffects.playClick();
        this.toggleDrawer();
        if (this.isDrawerOpen && this.userInputField) {
          setTimeout(() => this.userInputField.focus(), 300);
        }
      }
    });
    
    console.log("AI Operations Copilot Drawer active. Command Center keyboard shortcut listener registered.");
  }

  /**
   * Setup UI click hooks and keystroke handlers.
   */
  bindEvents() {
    // Floating button toggle
    const floatBtn = document.getElementById('float-copilot-trigger');
    if (floatBtn) {
      floatBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.toggleDrawer();
      });
    }

    // Close button click
    const closeBtn = document.getElementById('copilot-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.closeDrawer();
      });
    }

    // Send button click
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => {
        this.handleUserSend();
      });
    }

    // Input Enter key click
    if (this.userInputField) {
      this.userInputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleUserSend();
        }
      });
    }

    // Mic click
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => {
        this.toggleVoiceRecording();
      });
    }
  }

  /**
   * Slides the drawer in or out.
   */
  toggleDrawer() {
    this.isDrawerOpen ? this.closeDrawer() : this.openDrawer();
  }

  openDrawer() {
    if (!this.drawer) return;
    this.isDrawerOpen = true;
    this.drawer.classList.add('open');
    
    // Spring pop-in staggered animations for drawer controls
    gsap.fromTo(this.drawer.querySelectorAll('.drawer-header, .drawer-footer, #copilot-chat-history'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }
    );

    // Stagger all previous chat bubbles in history container
    const bubbles = this.chatHistoryContainer?.querySelectorAll('.chat-bubble');
    if (bubbles && bubbles.length > 0) {
      gsap.fromTo(bubbles,
        { opacity: 0, x: 30, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.4)', delay: 0.15 }
      );
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.isDrawerOpen = false;
    this.drawer.classList.remove('open');
  }

  /**
   * Process user input string and display bubble.
   */
  handleUserSend() {
    if (!this.userInputField) return;
    const text = this.userInputField.value.trim();
    if (!text) return;

    soundEffects.playClick();
    this.addChatBubble('user', text);
    this.userInputField.value = '';

    // Cache message in memory module
    memory.saveChatMessage('user', text);

    // AI streaming text animation simulation for M1
    this.simulateAssistantResponse(text);
  }

  /**
   * Append a chat bubble elements inside scroll container.
   * @param {string} sender 'user' | 'assistant'
   * @param {string} text 
   */
  addChatBubble(sender, text, source = null) {
    if (!this.chatHistoryContainer) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    if (sender === 'assistant') {
      // Add AI source badge
      if (source) {
        const badge = document.createElement('div');
        badge.style.cssText = 'display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.6rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04);';
        const dot = source === 'local' ? '🟡' : '🟢';
        const label = source === 'local' ? 'Local Reasoning' : 
          source === 'lm-studio' ? 'LM Studio AI' :
          source === 'ollama' ? 'Ollama AI' :
          source === 'gemini' ? 'Gemini AI' : 'AI Response';
        badge.innerHTML = `<span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">${dot} ${label}</span>`;
        bubble.appendChild(badge);
      }

      const content = document.createElement('div');
      content.innerHTML = this.renderMarkdown(text);
      bubble.appendChild(content);
      
      // Attach any queued recommendation cards (set by generateLocalRuleResponse)
      if (this._pendingRecommendation) {
        bubble.appendChild(this.createRecommendationDOM(this._pendingRecommendation));
        this._pendingRecommendation = null;
      }

      // Voice synthesises
      if (memory.preferences.voiceEnabled) {
        this.speakResponse(text);
      }
    } else {
      bubble.innerText = text;
    }
    
    this.chatHistoryContainer.appendChild(bubble);
    this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;

    // Apply quick GSAP bubble pop-in
    gsap.from(bubble, {
      opacity: 0,
      scale: 0.95,
      y: 10,
      duration: 0.3,
      ease: 'back.out(1.7)'
    });
  }

  /**
   * Helper: Generate a structured recommendation DOM card.
   */
  createRecommendationDOM(data) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.setAttribute('data-action', data.action);
    card.style.cssText = 'background: rgba(212,163,115,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;';
    
    let confLvl = 'HIGH';
    if (data.confidencePct < 75) confLvl = 'LOW';
    else if (data.confidencePct < 90) confLvl = 'MEDIUM';
    
    let confColor = confLvl === 'HIGH' ? 'var(--color-success)' : (confLvl === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-danger)');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:0.4rem;">
        <span class="btn-badge" style="background: var(--color-primary); color: #000; font-size: 0.62rem; font-weight: 700; border-radius: 4px; padding: 0.1rem 0.35rem; transform: none; position: static;">RECOMMENDATION</span>
        <span style="font-size: 0.68rem; color: var(--text-secondary);">Confidence: <strong style="color: ${confColor};">${confLvl} (${data.confidencePct}%)</strong></span>
      </div>
      
      <h4 style="font-size: 0.8rem; font-weight: 700; color: #FFF; margin: 0;">${data.title}</h4>
      
      <div style="font-size: 0.72rem; color: var(--text-secondary); line-height:1.35;">
        <strong>Observation:</strong> ${data.observation}
      </div>

      <!-- Expandable Reasoning -->
      <div class="why-expand-container" style="display: none; font-size: 0.7rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 0.5rem; margin-top: 0.25rem; line-height: 1.4;">
        <div style="margin-bottom: 0.25rem;"><strong>Reasoning:</strong> ${data.reasoning}</div>
        <div style="margin-bottom: 0.25rem;"><strong>Assumptions:</strong> ${data.assumptions}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; background:rgba(0,0,0,0.1); padding:0.4rem; border-radius:6px; margin-top:0.3rem;">
          <div>Cost: <strong style="color:#FFF;">${data.cost}</strong></div>
          <div>Expected ROI: <strong style="color:var(--color-primary);">${data.roi}</strong></div>
          <div>Benefit: <strong style="color:#FFF;">${data.benefit}</strong></div>
          <div>Time to Impact: <strong style="color:#FFF;">${data.timeToImpact}</strong></div>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.6rem; margin-top: 0.25rem; flex-wrap: wrap;">
        <button class="btn-secondary btn-why" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Why?</button>
        <div style="display: flex; gap: 0.3rem;">
          <button class="btn-secondary btn-save" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Save</button>
          <button class="btn-secondary btn-reject" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem; background: rgba(239, 68, 68, 0.03); border-color: rgba(239, 68, 68, 0.1); color: var(--color-danger);">Reject</button>
          <button class="btn-primary btn-apply" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Apply</button>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Setup card action button listeners.
   */
  setupCardDelegation() {
    if (!this.chatHistoryContainer) return;
    
    this.chatHistoryContainer.addEventListener('click', (e) => {
      const target = e.target;
      
      // Why? toggle
      if (target.classList.contains('btn-why')) {
        soundEffects.playClick();
        const card = target.closest('.recommendation-card');
        const expander = card.querySelector('.why-expand-container');
        if (expander) {
          expander.style.display = expander.style.display === 'none' ? 'block' : 'none';
        }
      }
      
      // Save
      if (target.classList.contains('btn-save')) {
        soundEffects.playSuccess();
        const card = target.closest('.recommendation-card');
        const title = card.querySelector('h4').innerText;
        
        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'saved');
        
        window.dispatchEvent(new CustomEvent('brewmind:toast', {
          detail: {
            title: 'Recommendation Saved',
            message: 'Bookmarked for operational audits.',
            type: 'info'
          }
        }));
      }

      // Reject
      if (target.classList.contains('btn-reject')) {
        soundEffects.playClick();
        const card = target.closest('.recommendation-card');
        const title = card.querySelector('h4').innerText;
        
        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'rejected');
        card.style.opacity = 0.5;
        target.disabled = true;
      }

      // Apply
      if (target.classList.contains('btn-apply')) {
        soundEffects.playSuccess();
        const card = target.closest('.recommendation-card');
        const action = card.getAttribute('data-action');
        const title = card.querySelector('h4').innerText;

        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'accepted');
        
        // Execute state changes
        const state = window.BrewMind.getState();
        if (action === 'hire_barista') {
          // Spawn temp barista details
          const tempName = ['Jordan', 'Taylor', 'Sam', 'Casey'][Math.floor(Math.random() * 4)];
          const skills = ['Junior', 'Intermediate', 'Senior'];
          const tempSkill = skills[Math.floor(Math.random() * skills.length)];
          let efficiency = 1.0;
          if (tempSkill === 'Junior') efficiency = 0.8;
          if (tempSkill === 'Senior') efficiency = 1.35;

          state.staff.list.push({
            name: tempName,
            busy: false,
            efficiency: efficiency,
            skill: tempSkill,
            ordersServed: 0,
            currentOrder: null
          });
          
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Staff Hired',
              message: `Spawned temporary barista ${tempName} (${tempSkill} skill) to live service line.`,
              type: 'success'
            }
          }));
        } else if (action === 'calibrate_machines') {
          state.machineHealth = 100;
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Calibration Succeeded',
              message: 'Espresso pressure and boiler temperature restored to 100%.',
              type: 'success'
            }
          }));
        } else if (action === 'restock_inventory') {
          state.inventory.coffeeBeans.current = state.inventory.coffeeBeans.max;
          state.inventory.milk.current = state.inventory.milk.max;
          state.inventory.cups.current = state.inventory.cups.max;
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Stock Replenished',
              message: 'Depleted storage containers refilled to maximum capacity.',
              type: 'success'
            }
          }));
        }

        window.BrewMind.setState(state);
        card.style.borderColor = 'var(--color-success)';
        target.disabled = true;
      }
    });
  }

  /**
   * Speak response aloud if voice feedback is enabled.
   */
  speakResponse(text) {
    if (!window.speechSynthesis || !memory.preferences.soundEnabled) return;
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[\*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Test local AI connection and update badge console telemetry.
   */
  async checkLocalAIStatus() {
    const { aiProvider, aiEndpoint } = memory.profile;
    const badgeEl = document.getElementById('local-ai-connection-status');
    if (!badgeEl) return;

    if (aiProvider !== 'lm-studio' && aiProvider !== 'ollama') {
      const hasKey = !!memory.profile.geminiKey;
      if (hasKey) {
        badgeEl.innerHTML = `<strong style="color:var(--color-success);">🟢 Cloud API Ready</strong><br/>Provider: ${aiProvider === 'openai' ? 'OpenAI' : 'Gemini'}<br/>Status: API Key Configured`;
      } else {
        badgeEl.innerHTML = `<strong style="color:var(--color-warning);">🟡 Local Heuristic Mode</strong><br/>No API key configured.<br/>Smart fallback reasoning active.`;
      }
      return;
    }

    const providerLabel = aiProvider === 'lm-studio' ? 'LM Studio' : 'Ollama';
    let testUrl = aiProvider === 'lm-studio' 
      ? `${aiEndpoint || 'http://127.0.0.1:1234'}/v1/models`
      : `${aiEndpoint || 'http://127.0.0.1:11434'}/api/tags`;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(testUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - start);
      if (response.ok) {
        const data = await response.json();
        let model = 'Unknown';
        if (aiProvider === 'lm-studio') {
          model = data.data?.[0]?.id || 'LM Studio Loaded Model';
        } else {
          model = data.models?.[0]?.name || 'Ollama Default';
        }
        this.detectedLocalModel = model;
        this._corsBlocked = false;
        
        badgeEl.innerHTML = `
          <strong style="color:var(--color-success);">🟢 ${providerLabel} Connected</strong><br/>
          Model: ${model}<br/>
          Latency: ${latency}ms<br/>
          Status: Ready
        `;
      } else {
        badgeEl.innerHTML = `<strong style="color:var(--color-warning);">🟡 ${providerLabel} Error</strong><br/>Server returned HTTP ${response.status}.<br/>Check server logs.`;
      }
    } catch(err) {
      this._corsBlocked = true;
      // Detect if this is likely CORS vs server offline
      const isCORS = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError';
      
      if (isCORS) {
        badgeEl.innerHTML = `
          <strong style="color:var(--color-danger);">🔴 CORS Blocked</strong><br/>
          ${providerLabel} is running but the browser blocked the request.<br/>
          <strong style="color:var(--color-primary);">Fix:</strong> Open ${providerLabel} → <strong>Server Settings</strong> → Enable <strong>CORS</strong><br/>
          Then refresh this page.
        `;
      } else if (err.name === 'AbortError') {
        badgeEl.innerHTML = `<strong style="color:var(--color-warning);">🟡 ${providerLabel} Timeout</strong><br/>Server is too slow to respond.<br/>Try restarting ${providerLabel}.`;
      } else {
        badgeEl.innerHTML = `<strong style="color:var(--color-warning);">🟡 ${providerLabel} Offline</strong><br/>Cannot connect to ${testUrl}<br/>Start ${providerLabel} and load a model.`;
      }
    }
  }

  /**
   * Simple markdown to HTML converter for chat bubbles.
   */
  renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<span style="display: block; padding-left: 0.8rem;">• $1</span>')
      .replace(/^\d+\. (.+)$/gm, '<span style="display: block; padding-left: 0.8rem;">$&</span>')
      .replace(/\n/g, '<br>');
  }

  /**
   * AI response handler with progressive reasoning stages.
   */
  async simulateAssistantResponse(userPrompt) {
    // Intercept direct geonav / action voice commands
    if (this.checkVoiceAndDirectCommands(userPrompt)) {
      return;
    }

    const { aiProvider } = memory.profile;
    const isLocalAI = (aiProvider === 'lm-studio' || aiProvider === 'ollama');
    const aiLabel = aiProvider === 'lm-studio' ? 'LM Studio' : aiProvider === 'ollama' ? 'Ollama' : aiProvider === 'gemini' ? 'Gemini' : 'AI';

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble assistant typing-dots';
    typingBubble.innerHTML = `<span style="opacity: 0.6;" id="thinking-stage-display">✨ Connecting to ${aiLabel}...</span>`;
    this.chatHistoryContainer.appendChild(typingBubble);
    this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;

    // Start the AI fetch immediately (no fake delay)
    try {
      // Show thinking stages while waiting
      const stageTimers = [
        setTimeout(() => { const el = document.getElementById('thinking-stage-display'); if (el) el.innerText = `🧠 ${aiLabel} is thinking...`; }, 800),
        setTimeout(() => { const el = document.getElementById('thinking-stage-display'); if (el) el.innerText = `📝 Composing response...`; }, 3000),
        setTimeout(() => { const el = document.getElementById('thinking-stage-display'); if (el) el.innerText = `⏳ Still working... (large model may take a moment)`; }, 8000)
      ];

      const reply = await this.fetchAIResponse(userPrompt);
      stageTimers.forEach(t => clearTimeout(t));
      typingBubble.remove();
      this.addChatBubble('assistant', reply, aiProvider || 'lm-studio');
      memory.saveChatMessage('assistant', reply);
    } catch (e) {
      console.warn("AI fetch failed:", e.message);
      typingBubble.remove();

      // If it's a timeout error
      if (e.message?.includes('timeout') || e.message?.includes('timed out')) {
        const timeoutMsg = `**⏰ Local AI Response Timeout**\n\nThe local AI server at **${aiLabel}** took too long to generate a response (over 45 seconds).\n\n**Suggestions to speed it up:**\n- **Reduce Model Size:** Try a smaller model like \`Qwen 2.5 1.5B\` or \`Llama 3.2 1B / 3B\` (LM Studio -> Search icon -> filter by 1B-3B sizes).\n- **Enable GPU:** Check **"Hardware Settings"** in LM Studio to offload layers to your GPU.\n\n*Using built-in local fallback reasoning for this answer:*`;
        this.addChatBubble('assistant', timeoutMsg, 'local');
        
        const fallbackReply = this.generateLocalRuleResponse(userPrompt);
        this.addChatBubble('assistant', fallbackReply, 'local');
        memory.saveChatMessage('assistant', fallbackReply);
      } else {
        // If CORS/Connection is the issue, show specific instructions
        const isCORS = e.message?.includes('Cannot reach') || e.message?.includes('CORS') || this._corsBlocked;
        if (isCORS && (aiProvider === 'lm-studio' || aiProvider === 'ollama')) {
          const corsMsg = `**⚠ ${aiLabel} Connection Blocked (CORS)**\n\nYour ${aiLabel} server is running but the browser is blocking the connection.\n\n**To fix this (takes 10 seconds):**\n1. Open **${aiLabel}**\n2. Click **"Server Settings"** (top bar)\n3. Enable **"Enable CORS"** toggle\n4. **Refresh this page**\n\nOnce CORS is enabled, I'll use ${aiLabel}'s **${this.detectedLocalModel || 'loaded model'}** for all responses!`;
          this.addChatBubble('assistant', corsMsg, 'local');
          memory.saveChatMessage('assistant', corsMsg);
        } else {
          // Seamless local fallback
          const reply = this.generateLocalRuleResponse(userPrompt);
          this.addChatBubble('assistant', reply, 'local');
          memory.saveChatMessage('assistant', reply);
        }
      }
    }
  }

  /**
   * Intercept special speech / typed shortcuts to trigger view redirections or simulator dispatches.
   */
  checkVoiceAndDirectCommands(text) {
    const p = text.toLowerCase().trim();
    if (p.includes('run rain simulation') || p.includes('rain scenario') || p.includes('simulate rain')) {
      this.closeDrawer();
      const navScenarios = document.getElementById('nav-scenarios');
      if (navScenarios) {
        navScenarios.click();
        setTimeout(() => {
          const rainCard = document.querySelector('.scenario-select-card[data-scenario="rain"]');
          if (rainCard) rainCard.click();
        }, 500);
      }
      return true;
    }
    
    if (p.includes('prepare for lunch rush') || p.includes('spawn rush')) {
      simulation.spawnRush();
      this.closeDrawer();
      return true;
    }
    
    if (p.includes('generate today\'s report') || p.includes('generate report')) {
      const expBtn = document.getElementById('btn-analytics-export');
      if (expBtn) expBtn.click();
      this.closeDrawer();
      return true;
    }
    
    return false;
  }

  /**
   * Unified AI Provider Abstraction Client Wrapper.
   * Supports: Gemini API, LM Studio, Ollama, OpenAI-compatible
   */
  async fetchAIResponse(userPrompt) {
    const { aiProvider, aiEndpoint, geminiKey } = memory.profile;
    const provider = aiProvider || 'lm-studio';
    
    // Build a rich, live state snapshot for AI context
    const state = window.BrewMind.getState();
    const staffDetails = state.staff.list.map(b => 
      `${b.name}: speed=${b.efficiency}x, stress=${b.stress}%, busy=${b.busy}, ordersServed=${b.ordersServed}, skill=${b.skill || 'Standard'}`
    ).join('\n  ');

    const stateContext = `
LIVE CAFÉ DASHBOARD DATA:
- Simulation Time: ${state.clock.hours.toString().padStart(2,'0')}:${state.clock.minutes.toString().padStart(2,'0')}
- Revenue Today: $${state.revenue.toFixed(2)}
- Orders: ${state.orders.completed} completed, ${state.orders.cancelled} cancelled
- Queue: ${state.customers.queueLength} students waiting
- Average Wait Time: ${state.customers.avgWaitTime.toFixed(1)} minutes
- Customer Satisfaction: ${state.customerSatisfaction}%
- Café Reputation Score: ${state.cafeReputation}/100
- Espresso Machine Health: ${state.machineHealth}%
- Campus Activity Level: ${state.campusActivity}
- Weather: ${state.weather.condition}, ${state.weather.temp}°C
- Staff:\n  ${staffDetails}
- Inventory:
  Coffee Beans: ${state.inventory.coffeeBeans.current.toFixed(1)}kg / ${state.inventory.coffeeBeans.max}kg (${(state.inventory.coffeeBeans.current/state.inventory.coffeeBeans.max*100).toFixed(0)}%)
  Milk: ${state.inventory.milk.current.toFixed(1)}L / ${state.inventory.milk.max}L (${(state.inventory.milk.current/state.inventory.milk.max*100).toFixed(0)}%)
  Cups: ${state.inventory.cups.current} / ${state.inventory.cups.max} (${(state.inventory.cups.current/state.inventory.cups.max*100).toFixed(0)}%)
`;
    
    const systemPrompt = `You are BrewMind AI — a highly intelligent Campus Café Business Copilot.

Your role is to help the café manager run a successful campus coffee shop. You have access to LIVE operational data below.

You can answer ANY question about:
- Business strategy (pricing, marketing, growth, profitability)
- Operations (staffing, scheduling, inventory management, equipment maintenance)
- Customer experience (wait times, satisfaction, menu optimization)
- Financial analysis (revenue forecasting, cost control, ROI)
- Staff management (performance, stress levels, shift rotation)
- Competitive analysis and market positioning
- Risk assessment and contingency planning

STAFF PROFILES:
- Emma: Fast (1.25x speed) but lower quality. Best for high-volume rush periods.
- Sophia: Balanced (1.0x speed, 1.0x quality). Reliable all-rounder.
- Liam: Slow (0.75x speed) but excellent quality (1.3x). Best for premium drinks and Faculty Guests.

GUIDELINES:
- Use the live data below to give specific, data-driven answers
- Reference actual numbers from the dashboard
- Be actionable — tell the manager exactly what to do
- Use markdown formatting: **bold** for key metrics, bullet points for lists
- Keep responses concise and fast (3-5 sentences maximum)
- If you spot problems in the data, proactively flag them
- Use emojis sparingly for visual clarity (✅, ⚠, 🔴, 📊, 💡)

${stateContext}`;

    if (provider === 'gemini') {
      const key = geminiKey || '';
      if (!key) {
        throw new Error("No Gemini API key configured.");
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nManager's Question: ${userPrompt}`
              }]
            }]
          })
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw new Error('Gemini API unreachable.');
      }
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error(data.error?.message || 'Invalid Gemini response.');
    }

    // --- OpenAI-Compatible Providers: LM Studio, Ollama, OpenAI ---
    let baseUrl = (aiEndpoint || (provider === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:1234')).replace(/\/+$/, '');
    
    baseUrl = baseUrl.replace(/\/v1\/chat\/completions\/?$/, '')
                     .replace(/\/chat\/completions\/?$/, '')
                     .replace(/\/v1\/?$/, '');
    
    const finalUrl = `${baseUrl}/v1/chat/completions`;

    const headers = { 'Content-Type': 'application/json' };
    if (geminiKey && provider === 'openai') {
      headers['Authorization'] = `Bearer ${geminiKey}`;
    }

    let modelName = 'gpt-3.5-turbo';
    if (provider === 'lm-studio') {
      modelName = this.detectedLocalModel || 'local-model';
    } else if (provider === 'ollama') {
      modelName = this.detectedLocalModel || 'llama3';
    }

    const payload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 250,
      stream: false
    };

    console.log(`[BrewMind AI] ${provider.toUpperCase()} → ${finalUrl} (model: ${modelName})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
      response = await fetch(finalUrl, {
        method: 'POST',
        headers: headers,
        signal: controller.signal,
        mode: 'cors',
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError' || fetchErr.message?.includes('abort')) {
        clearTimeout(timeoutId);
        throw new Error("AI request timed out. Local model is too slow.");
      }
      
      console.warn("Standard POST request failed. Retrying with simple Content-Type to bypass CORS preflight...", fetchErr);
      try {
        // Retry with Content-Type: text/plain to bypass OPTIONS preflight
        response = await fetch(finalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });
      } catch (retryErr) {
        clearTimeout(timeoutId);
        if (retryErr.name === 'AbortError' || retryErr.message?.includes('abort')) {
          throw new Error("AI request timed out. Local model is too slow.");
        }
        throw new Error(`Cannot reach ${provider === 'lm-studio' ? 'LM Studio' : provider === 'ollama' ? 'Ollama' : 'API'} server.`);
      }
    }

    clearTimeout(timeoutId);

    let responseText = '';
    try {
      responseText = await response.text();
    } catch (readErr) {
      throw new Error('Unable to read AI response.');
    }

    if (!response.ok) {
      console.error(`[BrewMind AI] Error ${response.status}:`, responseText.substring(0, 200));
      throw new Error(`AI server returned ${response.status}.`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonErr) {
      throw new Error('Invalid JSON from AI provider.');
    }

    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    throw new Error('Unexpected AI response format.');
  }

  /**
   * Generates a state-aware response using local heuristic rules if offline.
   */
  generateLocalRuleResponse(prompt) {
    const state = window.BrewMind.getState();
    const p = prompt.toLowerCase().trim();
    this._pendingRecommendation = null;

    // --- System / AI status queries ---
    if (p.includes('lm studio') || p.includes('lmstudio') || p.includes('ollama') || p.includes('api') || p.includes('ai status') || p.includes('connected') || p.includes('working')) {
      const { aiProvider, aiEndpoint, geminiKey } = memory.profile;
      const hasKey = !!geminiKey;
      const isLocal = aiProvider === 'lm-studio' || aiProvider === 'ollama';
      const providerLabel = aiProvider === 'lm-studio' ? 'LM Studio' : 'Ollama';
      const modelDetected = this.detectedLocalModel;
      
      if (isLocal && modelDetected) {
        return `**AI Status: ✅ Connected**\n- Provider: **${providerLabel}**\n- Model: **${modelDetected}**\n- Endpoint: ${aiEndpoint || 'Default'}\n\nYour local AI is running and ready!`;
      } else if (isLocal && this._corsBlocked) {
        return `**AI Status: 🔴 CORS Blocked**\n\n${providerLabel} is running but the browser is **blocking** the connection.\n\n**Fix this in 10 seconds:**\n1. Open **${providerLabel}**\n2. Click **"Server Settings"** at the top\n3. Turn ON **"Enable CORS"**\n4. **Refresh this page**\n\nThat's it! After enabling CORS, I'll connect to your local AI automatically.`;
      } else if (isLocal) {
        return `**AI Status: ⚠ Not Connected**\n- Provider: **${providerLabel}** (selected)\n- Endpoint: ${aiEndpoint || 'http://127.0.0.1:1234'}\n\n**Checklist:**\n1. ✅ Is ${providerLabel} running? (Check taskbar)\n2. ✅ Is a model loaded? (Open ${providerLabel} → Load a model)\n3. ✅ Is CORS enabled? (Server Settings → Enable CORS)\n4. ✅ Is the server started? (Local Server → Start)\n\nAfter fixing, **refresh this page**.`;
      } else if (hasKey) {
        return `**AI Status: ✅ Cloud API Ready**\n- Provider: **${aiProvider === 'openai' ? 'OpenAI' : 'Gemini'}**\n- API Key: Configured`;
      } else {
        return `**AI Status: No AI Configured**\n\n**Options to enable AI:**\n- **Local:** Start LM Studio or Ollama, load a model, enable CORS\n- **Cloud:** Go to Settings → enter a Gemini API Key`;
      }
    }

    // --- Greetings ---
    if (/^(hi|hello|hey|yo|sup|good morning|good evening|good afternoon)\b/.test(p)) {
      // Build a contextual greeting based on current state
      const hour = state.clock.hours;
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const qLen = state.customers.queueLength;
      const sat = state.customerSatisfaction;
      
      let statusNote = '';
      if (qLen > 6) statusNote = `\n\n⚠ **Heads up:** Queue is at **${qLen} students** — consider hiring temp staff.`;
      else if (sat < 70) statusNote = `\n\n⚠ **Attention:** Satisfaction dropped to **${sat}%** — let's investigate.`;
      else if (state.machineHealth < 60) statusNote = `\n\n⚠ **Alert:** Machine health is at **${state.machineHealth}%** — maintenance needed.`;
      else statusNote = `\n\n✅ Operations look healthy! Queue: ${qLen} students, Satisfaction: ${sat}%.`;
      
      return `${timeGreeting}! I'm **BrewMind**, your AI Operations Copilot.${statusNote}\n\nWhat would you like to know? Try asking me things like:\n- *"How are my baristas doing?"*\n- *"Should I restock?"*\n- *"What's our revenue today?"*\n- *"Optimize my operations"*`;
    }

    // --- Staff analysis ---
    if (p.includes('staff') || p.includes('emma') || p.includes('liam') || p.includes('sophia') || p.includes('barista') || p.includes('hire') || p.includes('team')) {
      const emma = state.staff.list.find(b => b.name === 'Emma');
      const sophia = state.staff.list.find(b => b.name === 'Sophia');
      const liam = state.staff.list.find(b => b.name === 'Liam');
      
      // Analyze if hiring is actually needed
      const qLen = state.customers.queueLength;
      let actionAdvice = '';
      if (qLen > 5) {
        actionAdvice = `\n\n**⚡ Action Needed:** Queue is congested (${qLen} students). I recommend hiring temporary support.`;
        this._pendingRecommendation = {
          action: 'hire_barista', title: 'Hire Temporary Barista Support',
          observation: `Queue length is ${qLen} students — exceeding comfortable thresholds.`,
          reasoning: 'Adding a barista splits the register load and accelerates drink prep during rush.',
          assumptions: 'Arrival rates remain stable; equipment is operational.',
          confidencePct: 94, cost: '₹850', benefit: 'Wait time decreases ~31%', roi: '147%', timeToImpact: 'Immediate'
        };
      } else {
        actionAdvice = `\n\nStaffing looks adequate for current demand (${qLen} in queue).`;
      }
      
      return `**Barista Performance:**\n- **Emma** — Speed: 1.25x, Stress: **${emma?.stress || 0}%**, Orders: ${emma?.ordersServed || 0}. ${emma?.busy ? '🔴 Busy' : '🟢 Free'}\n- **Sophia** — Speed: 1.0x, Quality: 1.0x, Stress: **${sophia?.stress || 0}%**. ${sophia?.busy ? '🔴 Busy' : '🟢 Free'}\n- **Liam** — Speed: 0.75x, Quality: 1.3x, Stress: **${liam?.stress || 0}%**. ${liam?.busy ? '🔴 Busy' : '🟢 Free'}${actionAdvice}`;
    }

    // --- Inventory ---
    if (p.includes('inventory') || p.includes('beans') || p.includes('milk') || p.includes('stock') || p.includes('restock') || p.includes('replenish') || p.includes('supplies')) {
      const beans = state.inventory.coffeeBeans;
      const milk = state.inventory.milk;
      const cups = state.inventory.cups;
      const beansPct = (beans.current / beans.max * 100).toFixed(0);
      const milkPct = (milk.current / milk.max * 100).toFixed(0);
      const cupsPct = (cups.current / cups.max * 100).toFixed(0);
      
      let critical = [];
      if (beansPct < 35) critical.push('Coffee Beans');
      if (milkPct < 35) critical.push('Milk');
      if (cupsPct < 35) critical.push('Cups');
      
      if (critical.length > 0) {
        this._pendingRecommendation = {
          action: 'restock_inventory', title: 'Emergency Restock Required',
          observation: `${critical.join(', ')} stock below 35% capacity.`,
          reasoning: 'Low stock leads to order cancellations and lost revenue during peak hours.',
          assumptions: 'Campus supply courier is available.',
          confidencePct: 96, cost: '₹500', benefit: 'Stock restored to 100%', roi: '320%', timeToImpact: 'Immediate'
        };
      }
      
      return `**Inventory Analysis:**\n- ☕ Coffee Beans: **${beans.current.toFixed(1)}kg / ${beans.max}kg** (${beansPct}%) ${beansPct < 35 ? '🔴 LOW' : '🟢'}\n- 🥛 Milk: **${milk.current.toFixed(1)}L / ${milk.max}L** (${milkPct}%) ${milkPct < 35 ? '🔴 LOW' : '🟢'}\n- 🥤 Cups: **${cups.current} / ${cups.max}** (${cupsPct}%) ${cupsPct < 35 ? '🔴 LOW' : '🟢'}\n${critical.length > 0 ? `\n**⚠ ${critical.join(' & ')} running critically low — restock recommended!**` : '\n✅ All stock levels are healthy.'}`;
    }

    // --- Queue / Wait / Satisfaction ---
    if (p.includes('queue') || p.includes('wait') || p.includes('satisfaction') || p.includes('reputation') || p.includes('customer')) {
      const qLen = state.customers.queueLength;
      const sat = state.customerSatisfaction;
      const rep = state.cafeReputation;
      const avgWait = state.customers.avgWaitTime;
      
      let analysis = '';
      if (qLen > 8) analysis = '\n\n**🔴 Critical:** Queue is dangerously long. Customers will start leaving. Hire temp staff immediately.';
      else if (qLen > 5) analysis = '\n\n**⚠ Warning:** Queue building up. Consider adding staff or speeding up service.';
      else if (sat < 60) analysis = '\n\n**⚠ Warning:** Satisfaction is dropping. Check wait times and machine health.';
      else analysis = '\n\n✅ Operations are running smoothly.';
      
      return `**Customer & Queue Analysis:**\n- Queue Length: **${qLen} students** ${qLen > 5 ? '⚠' : '✅'}\n- Avg Wait Time: **${avgWait.toFixed(1)} min**\n- Satisfaction: **${sat}%** ${sat > 80 ? '(excellent)' : sat > 60 ? '(good)' : '(needs attention)'}\n- Reputation: **${rep}/100**${analysis}`;
    }

    // --- Revenue / Sales ---
    if (p.includes('revenue') || p.includes('sales') || p.includes('money') || p.includes('profit') || p.includes('earning') || p.includes('income')) {
      const elapsedHours = Math.max(0.1, (state.clock.hours + state.clock.minutes / 60) - 6);
      const hourlyRate = (state.revenue / elapsedHours).toFixed(2);
      const projected = (parseFloat(hourlyRate) * 12).toFixed(2);
      return `**Revenue Report:**\n- Total Today: **$${state.revenue.toFixed(2)}**\n- Orders: **${state.orders.completed}** completed, **${state.orders.cancelled}** cancelled\n- Hourly Rate: **$${hourlyRate}/hr**\n- Projected Daily: **$${projected}**\n${state.orders.cancelled > 3 ? '\n⚠ High cancellation rate — check inventory and wait times.' : '\n✅ Revenue trajectory looks healthy.'}`;
    }

    // --- Machine / Maintenance ---
    if (p.includes('machine') || p.includes('espresso') || p.includes('equipment') || p.includes('maintenance') || p.includes('calibrat')) {
      const health = state.machineHealth;
      
      if (health < 70) {
        this._pendingRecommendation = {
          action: 'calibrate_machines', title: 'Calibrate Espresso Systems',
          observation: `Machine health at ${health}% — risk of thermal failure.`,
          reasoning: 'Calibrating pressure and temperature systems prevents breakdowns during peak hours.',
          assumptions: 'Spare parts available; no power outages.',
          confidencePct: 88, cost: '₹350', benefit: 'Machine health restored to 100%', roi: '210%', timeToImpact: '15 minutes'
        };
      }
      
      return `**Equipment Status:**\n- Machine Health: **${health}%** ${health > 80 ? '✅' : health > 50 ? '⚠' : '🔴'}\n- ${health > 80 ? 'Operating normally. No maintenance needed.' : health > 50 ? 'Performance degrading — schedule calibration soon.' : 'CRITICAL — failure imminent! Run maintenance NOW.'}\n${health < 70 ? '\n**Recommendation:** Calibrate immediately to prevent downtime.' : ''}`;
    }

    // --- Weather ---
    if (p.includes('weather') || p.includes('rain') || p.includes('sunny') || p.includes('temperature') || p.includes('forecast')) {
      const w = state.weather;
      const tip = w.condition === 'Rainy' ? '☔ Hot drinks demand +25%. Promote Hot Chocolate & Chai.'
        : w.condition === 'Sunny' ? '☀ Cold drinks trending. Feature Cold Brew & Iced Latte.'
        : '🌤 Moderate weather. Standard menu expected.';
      return `**Weather Impact:**\n- Conditions: **${w.condition}, ${w.temp}°C**\n- ${tip}`;
    }

    // --- Optimize / Suggest / Recommend ---
    if (p.includes('optimize') || p.includes('suggest') || p.includes('recommend') || p.includes('improve') || p.includes('advice') || p.includes('what should')) {
      const issues = [];
      if (state.customers.queueLength > 5) issues.push(`Queue is long (${state.customers.queueLength}) — **hire temp staff**`);
      if (state.machineHealth < 70) issues.push(`Machine health low (${state.machineHealth}%) — **run calibration**`);
      if (state.inventory.coffeeBeans.current / state.inventory.coffeeBeans.max < 0.35) issues.push('Coffee beans running low — **restock now**');
      if (state.inventory.milk.current / state.inventory.milk.max < 0.35) issues.push('Milk supply low — **restock now**');
      if (state.customerSatisfaction < 65) issues.push(`Satisfaction dropping (${state.customerSatisfaction}%) — **reduce wait times**`);
      
      const emma = state.staff.list.find(b => b.name === 'Emma');
      if (emma?.stress > 70) issues.push(`Emma's stress at ${emma.stress}% — **rotate her off register**`);
      
      if (issues.length === 0) {
        return `**Operations Analysis:** ✅ Everything looks great!\n\nAll metrics are within healthy ranges. Keep monitoring during the next class break rush.\n\n- Queue: ${state.customers.queueLength} students\n- Satisfaction: ${state.customerSatisfaction}%\n- Machine: ${state.machineHealth}%\n- Revenue: $${state.revenue.toFixed(2)}`;
      }
      return `**Operations Analysis — ${issues.length} issue${issues.length > 1 ? 's' : ''} found:**\n${issues.map((issue, i) => `${i+1}. ${issue}`).join('\n')}\n\nWould you like me to act on any of these?`;
    }

    // --- Help ---
    if (p.includes('help') || p === 'commands' || p === '?') {
      return `Here's what I can help with:\n\n- *"How are my baristas doing?"* — Staff performance analysis\n- *"Check inventory"* — Stock level audit\n- *"What's our revenue?"* — Sales & earnings report\n- *"Queue status"* — Wait times & satisfaction\n- *"Machine health"* — Equipment diagnostics\n- *"Optimize operations"* — Find & fix issues\n- *"Is LM Studio working?"* — AI connection status\n- *"Weather impact"* — Weather-based menu suggestions\n\n**Voice commands:** *"Run rain simulation"*, *"Prepare for lunch rush"*, *"Generate report"*`;
    }

    // --- Intelligent contextual fallback: analyze state and give the most relevant insight ---
    const issues = [];
    if (state.customers.queueLength > 5) issues.push('high queue');
    if (state.machineHealth < 70) issues.push('machine issues');
    if (state.customerSatisfaction < 65) issues.push('low satisfaction');
    if (state.inventory.coffeeBeans.current / state.inventory.coffeeBeans.max < 0.35) issues.push('low beans');
    if (state.inventory.milk.current / state.inventory.milk.max < 0.35) issues.push('low milk');
    
    if (issues.length > 0) {
      return `I'm not sure what you mean by *"${prompt}"*, but I noticed some issues:\n\n${issues.map(i => `- ⚠ **${i.charAt(0).toUpperCase() + i.slice(1)}**`).join('\n')}\n\nTry asking *"optimize operations"* for detailed recommendations, or type *"help"* to see what I can do.`;
    }
    
    return `Thanks for the message! I analyzed your current state and everything looks healthy:\n\n- Queue: **${state.customers.queueLength}** students ✅\n- Satisfaction: **${state.customerSatisfaction}%** ✅\n- Revenue: **$${state.revenue.toFixed(2)}**\n- Machine: **${state.machineHealth}%** ✅\n\nTry asking me something specific like *"check inventory"*, *"staff performance"*, or *"optimize operations"*. Type *"help"* for all commands.`;
  }

  /**
   * Connect browser speech API hooks.
   */
  setupSpeechRecognition() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechClass();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.voiceBtn.style.color = 'var(--color-danger)';
      this.voiceBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      if (this.userInputField) {
        this.userInputField.placeholder = "Listening to speech...";
      }
    };

    this.recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      if (this.userInputField) {
        this.userInputField.value = resultText;
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.voiceBtn.style.color = 'var(--text-secondary)';
      this.voiceBtn.style.background = 'transparent';
      if (this.userInputField) {
        this.userInputField.placeholder = "Type a message or click mic...";
      }
    };
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Speech Error',
          message: 'Voice recognition is not supported by your browser.',
          type: 'danger'
        }
      }));
      return;
    }

    soundEffects.playClick();
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
}

export const copilot = new AICopilot();
