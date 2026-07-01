/* -------------------------------------------------------------
 * BREWMIND AI - AI Operations Copilot Drawer
 * ------------------------------------------------------------- */
import { memory } from './memory.js?v=2.0';
import { soundEffects } from './utils.js?v=2.0';
import { simulation } from './simulation.js?v=2.0';

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

    // Suggestion chips delegation
    if (this.chatHistoryContainer) {
      this.chatHistoryContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggest-chip-btn');
        if (chip) {
          const query = chip.getAttribute('data-query');
          if (query && this.userInputField) {
            this.userInputField.value = query;
            this.handleUserSend();
          }
        }
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
    if (!text) return '';
    
    // Escape HTML characters safely
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Parse headers (###, ##, #)
    html = html.replace(/^### (.*?)$/gm, '<h4 style="color: var(--color-primary); font-size: 0.92rem; margin: 0.8rem 0 0.4rem 0; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; letter-spacing: 0.3px; border-bottom: 1px solid rgba(212, 163, 115, 0.08); padding-bottom: 0.25rem;">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 style="color: #FFF; font-size: 1.05rem; margin: 1rem 0 0.5rem 0; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; letter-spacing: 0.3px;">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 style="color: #FFF; font-size: 1.2rem; margin: 1.2rem 0 0.6rem 0; font-weight: 800; display: flex; align-items: center; gap: 0.4rem; letter-spacing: 0.3px;">$1</h2>');

    // Parse bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFF; font-weight: 700;">$1</strong>');

    // Parse italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em style="color: var(--text-secondary); font-style: italic;">$1</em>');

    // Parse styled bullet points (- item or * item)
    html = html.replace(/^[-\*] (.*?)$/gm, '<div style="display: flex; align-items: flex-start; gap: 0.45rem; margin: 0.35rem 0; font-size: 0.82rem; line-height: 1.45; color: var(--text-secondary);"><span style="color: var(--color-primary); flex-shrink: 0; font-size: 0.75rem; margin-top: 0.15rem;">◆</span><span style="flex-grow: 1;">$1</span></div>');

    // Parse ordered lists (1. item)
    html = html.replace(/^(\d+)\. (.*?)$/gm, '<div style="display: flex; align-items: flex-start; gap: 0.45rem; margin: 0.35rem 0; font-size: 0.82rem; line-height: 1.45; color: var(--text-secondary);"><span style="color: var(--color-primary); font-weight: 700; font-size: 0.82rem; min-width: 14px; text-align: right; flex-shrink: 0;">$1.</span><span style="flex-grow: 1;">$2</span></div>');

    // Replace newlines with standard paragraph line breaks (except after lists and headers)
    html = html.replace(/\n/g, '<br>');

    // Format highlight recommendation boxes (e.g. text containing BrewMind Recommendation)
    if (html.includes('💡')) {
      html = html.replace(/💡 (&lt;strong style=&quot;color: #FFF; font-weight: 700;&quot;&gt;)?BrewMind Recommendation:?(&lt;\/strong&gt;)?(<br>)?(.*?)(?=(<h4|<div|$))/g, 
        '<div style="background: rgba(212, 163, 115, 0.04); border-left: 3px solid var(--color-primary); border-radius: 6px; padding: 0.75rem; margin: 0.75rem 0; font-size: 0.8rem; line-height: 1.45; color: var(--text-secondary);"><div style="font-weight: 700; color: #FFF; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">💡 BrewMind Recommendation</div>$4</div>'
      );
    }

    return html;
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
    
    const systemPrompt = `You are BrewMind AI — a charismatic, highly analytical Campus Café Business Consultant & Master Barista.

PERSONALITY & TONE:
- **Expert & Analytical**: Speak like a top-tier retail manager and retail operations consultant. You understand margins, employee utilization, JIT logistics, and supply chains.
- **Charismatic & Caffeinated**: Warm, encouraging, energetic, and highly professional. Use subtle espresso-themed double-entendres when appropriate (e.g., "let's grind down on the numbers", "brewing up a strategy", "keeping stress levels from boiling over"), but keep it crisp and professional.
- **Data-Driven**: Never speak in generalities. Always cite the exact live figures from the café's state context below.

ROLE & RESPONSIBILITY:
- Help the café manager (samvit) optimize store operations, increase hourly revenue, minimize queue bottlenecks, manage barista burnout, and guarantee freshness.
- Scan the live state data below. If you detect ANY metric that is slipping (e.g., satisfaction < 70%, machine health < 75%, queue length > 5, inventory below 35%), proactively flag it with a ⚠ or 🔴 indicator.

STAFF CHARACTERISTICS:
- **Emma**: Fast (1.25x speed) but lower quality (0.7x). Best for high-volume student rushes. High stress sensitivity.
- **Sophia**: Balanced (1.0x speed, 1.0x quality). A reliable, steady all-rounder barista.
- **Liam**: Slow (0.75x speed) but premium quality (1.3x). Best for high-margin specialty drinks and Faculty Guests to drive reputation.

OUTPUT STYLE:
- Use markdown headers (e.g., \`### Staff Assessment\`) to structure your answer.
- Always include a highlighted **💡 BrewMind Recommendation** section with a clear action item at the bottom.
- Keep responses compact, fast, and structured for quick reading on a dashboard.

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
   * Generate  generateLocalRuleResponse(prompt) {
    const state = window.BrewMind.getState();
    const p = prompt.toLowerCase().trim();
    this._pendingRecommendation = null;

    // Helper to calculate inventory status
    const getInvPct = (item) => (item.current / item.max * 100).toFixed(0);

    // --- Intent 1: AI / System Diagnostics ---
    if (p.includes('lm studio') || p.includes('lmstudio') || p.includes('ollama') || p.includes('api') || p.includes('ai status') || p.includes('connected') || p.includes('working')) {
      const { aiProvider, aiEndpoint, geminiKey } = memory.profile;
      const hasKey = !!geminiKey;
      const isLocal = aiProvider === 'lm-studio' || aiProvider === 'ollama';
      const providerLabel = aiProvider === 'lm-studio' ? 'LM Studio' : 'Ollama';
      const modelDetected = this.detectedLocalModel;
      
      if (isLocal && modelDetected) {
        return `### ⚙ AI System Diagnostics: Connected\n\nI am currently hooked into your local **${providerLabel}** instance running **${modelDetected}** at \`${aiEndpoint || 'default'}\`.\n\nAll natural language requests are processed locally with zero cloud delay. Let's brew some smart strategies! ☕`;
      } else if (isLocal && this._corsBlocked) {
        return `### ⚙ AI System Diagnostics: CORS Blocked\n\nYour **${providerLabel}** server is active, but the browser is blocking my requests due to cross-origin security rules.\n\n**Quick Fix (10 seconds):**\n1. Open **${providerLabel}**\n2. Click the **"Settings" / "Server Settings"** icon\n3. Enable the **"CORS" (Cross-Origin Resource Sharing)** toggle\n4. **Hard-refresh this page**\n\nI'll connect immediately after the refresh!`;
      } else if (isLocal) {
        return `### ⚙ AI System Diagnostics: Offline\n\nI cannot establish a connection with the local **${providerLabel}** server at \`${aiEndpoint || 'http://127.0.0.1:1234'}\`.\n\n**Operational Checklist:**\n- [ ] Is ${providerLabel} launched on your system?\n- [ ] Is a model loaded and running in the background?\n- [ ] Is the local port open and CORS enabled?\n\n*Running in high-fidelity local heuristic mode until connection is established.*`;
      } else if (hasKey) {
        return `### ⚙ AI System Diagnostics: Cloud Active\n\nI am connected to the cloud **${aiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API**. Live telemetry tokens are actively feeding the model.`;
      } else {
        return `### ⚙ AI System Diagnostics: Heuristic Mode\n\nNo active LLM API key or local servers are configured. I am running on my built-in state-aware reasoning engine.\n\nTo unlock deep reasoning, go to **Settings** and configure a Gemini API key or start a local LM Studio / Ollama server.`;
      }
    }

    // --- Intent 2: Small Talk / Greetings ---
    if (/^(hi|hello|hey|yo|sup|good morning|good evening|good afternoon|who are you|name)\b/.test(p)) {
      const hour = state.clock.hours;
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const qLen = state.customers.queueLength;
      const sat = state.customerSatisfaction;
      
      let stateAlert = '';
      if (qLen > 6) {
        stateAlert = `\n\n⚠ **Heads up:** The queue is stacking up with **${qLen} students**. Emma and Sophia are under load—we should grind down and optimize shifts.`;
      } else if (sat < 70) {
        stateAlert = `\n\n⚠ **Heads up:** Customer satisfaction has dropped to **${sat}%**. Let's check wait times or machine health before we lose reputation.`;
      } else {
        stateAlert = `\n\n✅ Operations look steady! We have **${qLen}** in queue and a solid **${sat}%** satisfaction index.`;
      }

      return `### ☕ Greetings, manager!\n\n${timeGreeting}! I am **BrewMind AI**, your caffeinated operations consultant. I've scanned the cafe's sensors and compiled a live view.${stateAlert}\n\nAsk me anything about your baristas (*"staff performance"*), stock (*"check inventory"*), profitability (*"revenue"*), or type *"help"* for a list of operations commands!`;
    }

    // --- Intent 3: Staffing / Baristas ---
    if (p.includes('staff') || p.includes('emma') || p.includes('liam') || p.includes('sophia') || p.includes('barista') || p.includes('hire') || p.includes('team') || p.includes('employee')) {
      const emma = state.staff.list.find(b => b.name === 'Emma');
      const sophia = state.staff.list.find(b => b.name === 'Sophia');
      const liam = state.staff.list.find(b => b.name === 'Liam');
      
      const qLen = state.customers.queueLength;
      let recommendationBlock = '';
      let urgencyText = '';

      if (qLen > 5) {
        urgencyText = `\n\n⚠ **Congestion Alert:** Queue length is currently **${qLen} students**, causing average wait times to rise to **${state.customers.avgWaitTime.toFixed(1)} mins**.`;
        
        this._pendingRecommendation = {
          action: 'hire_barista',
          title: 'Hire Temporary Barista Support',
          confidencePct: 94,
          observation: `Queue size is ${qLen} students, pushing staff stress values up.`,
          reasoning: 'Adding an extra barista to the register splits transaction processing time, allowing Emma and Sophia to focus solely on brewing.',
          assumptions: 'Budget has sufficient operational cash; spare registers are open.',
          cost: '$15/hr',
          roi: '154% (recovers abandoned cart sales)',
          benefit: 'Queue bottleneck reduced by ~35%',
          timeToImpact: 'Immediate'
        };
        recommendationBlock = `\n\n💡 **BrewMind Recommendation:**\nI have prepared a shift-optimization recommendation to hire a temporary barista support. Click **Apply** below to add support to the register line!`;
      } else {
        urgencyText = `\n\n✅ **Staff Load:** Queue is clear (${qLen} waiting). Current staff distribution is adequate for demand.`;
      }

      return `### 📊 Barista Shift Performance\n\n* **Emma** — Speed: **1.25x**, Quality: **0.7x**, Stress: **${emma?.stress || 0}%**, Orders served: **${emma?.ordersServed || 0}**. Status: ${emma?.busy ? '🔴 Brewing' : '🟢 Idle'}\n* **Sophia** — Speed: **1.0x**, Quality: **1.0x**, Stress: **${sophia?.stress || 0}%**, Orders served: **${sophia?.ordersServed || 0}**. Status: ${sophia?.busy ? '🔴 Brewing' : '🟢 Idle'}\n* **Liam** — Speed: **0.75x**, Quality: **1.3x** (Specialty Expert), Stress: **${liam?.stress || 0}%**, Orders served: **${liam?.ordersServed || 0}**. Status: ${liam?.busy ? '🔴 Brewing' : '🟢 Idle'}${urgencyText}${recommendationBlock}`;
    }

    // --- Intent 4: Inventory / Stock / Suppliers ---
    if (p.includes('inventory') || p.includes('beans') || p.includes('milk') || p.includes('stock') || p.includes('restock') || p.includes('replenish') || p.includes('supplies')) {
      const beans = state.inventory.coffeeBeans;
      const milk = state.inventory.milk;
      const cups = state.inventory.cups;
      const beansPct = parseFloat(getInvPct(beans));
      const milkPct = parseFloat(getInvPct(milk));
      const cupsPct = parseFloat(getInvPct(cups));

      let lowItems = [];
      if (beansPct < 40) lowItems.push('Coffee Beans');
      if (milkPct < 40) lowItems.push('Milk');
      if (cupsPct < 40) lowItems.push('Cups');

      let recommendationBlock = '';
      if (lowItems.length > 0) {
        this._pendingRecommendation = {
          action: 'restock_inventory',
          title: 'Replenish Core Inventory Stock',
          confidencePct: 96,
          observation: `Low stock detected on ${lowItems.join(', ')}.`,
          reasoning: 'Running out of ingredients triggers immediate order cancellations, dropping customer satisfaction by 15-20 points.',
          assumptions: 'Local campus suppliers are open and lead times remain standard.',
          cost: '$45.00',
          roi: '320% (prevented sales cancellation losses)',
          benefit: 'Restores inventory status to 100% capacity',
          timeToImpact: '25 simulated minutes'
        };
        recommendationBlock = `\n\n💡 **BrewMind Recommendation:**\nCritical stock warning. I recommend placing a JIT replenishment order. Click **Apply** below to trigger immediate delivery!`;
      } else {
        recommendationBlock = `\n\n✅ **Inventory Status:** All core ingredient levels are well-stocked and fresh. No urgent restocking is necessary.`;
      }

      return `### 📦 Live Inventory Audit\n\n* **☕ Coffee Beans**: **${beans.current.toFixed(1)}kg / ${beans.max}kg** (${beansPct}%) — ${beansPct < 40 ? '🔴 Warning: Low' : '🟢 Healthy'}\n* **🥛 Sourced Milk**: **${milk.current.toFixed(1)}L / ${milk.max}L** (${milkPct}%) — ${milkPct < 40 ? '🔴 Warning: Low' : '🟢 Healthy'}\n* **🥤 Biodegradable Cups**: **${cups.current} / ${cups.max}** (${cupsPct}%) — ${cupsPct < 40 ? '🔴 Warning: Low' : '🟢 Healthy'}${recommendationBlock}`;
    }

    // --- Intent 5: Revenue / Margins / Financials ---
    if (p.includes('revenue') || p.includes('sales') || p.includes('money') || p.includes('profit') || p.includes('earning') || p.includes('income') || p.includes('margin') || p.includes('pricing') || p.includes('charge')) {
      const elapsedHours = Math.max(0.5, (state.clock.hours + state.clock.minutes / 60) - 6);
      const hourlyRate = (state.revenue / elapsedHours).toFixed(2);
      const projectedSales = (parseFloat(hourlyRate) * 12).toFixed(2);
      const completed = state.orders.completed;
      const cancelled = state.orders.cancelled;
      const cancelRate = completed + cancelled > 0 ? (cancelled / (completed + cancelled) * 100).toFixed(0) : 0;

      // Business margin logic: Average espresso sale price is $4.50, ingredient unit cost (beans + milk + cup) is ~$0.85
      const grossMarginPct = 81; // ~81% gross margins on coffee
      
      let financialAdvice = '';
      if (parseFloat(cancelRate) > 8) {
        financialAdvice = `\n\n⚠ **Margin Leakage:** Your order cancellation rate is at **${cancelRate}%** due to stockout or delays. This is leaking about **$${(cancelled * 4.50).toFixed(2)}** in lost revenue. We must resolve inventory bottlenecks immediately.`;
      } else {
        financialAdvice = `\n\n📈 **Financial health:** Gross margin on beverage sales is holding strong at **${grossMarginPct}%**. Upselling milk alternatives (Oat/Almond) for a $0.60 premium will increase margins by another 4%.`;
      }

      return `### 💸 Store Financial Performance\n\n* **Total Revenue Today**: **$${state.revenue.toFixed(2)}**\n* **Orders Logged**: **${completed}** completed, **${cancelled}** cancelled (${cancelRate}% cancellation rate)\n* **Store Velocity**: **$${hourlyRate}/hr**\n* **Projected Daily Revenue**: **$${projectedSales}**\n* **Gross Beverage Margin**: **${grossMarginPct}%**${financialAdvice}`;
    }

    // --- Intent 6: Queue / Wait Times / Satisfaction ---
    if (p.includes('queue') || p.includes('wait') || p.includes('satisfaction') || p.includes('reputation') || p.includes('customer')) {
      const qLen = state.customers.queueLength;
      const sat = state.customerSatisfaction;
      const rep = state.cafeReputation;
      const avgWait = state.customers.avgWaitTime;
      
      let breakdown = '';
      if (qLen > 5) {
        breakdown = `\n\n⚠ **Bottleneck Detected:** Student wait times are averaging **${avgWait.toFixed(1)} minutes**. Emma's prep speed is high, but registration queueing is creating a pileup. Suggest deploying a temp staff or adjusting register priority.`;
      } else {
        breakdown = `\n\n✅ **Service Flow:** Flow rate is optimal. Average wait time is **${avgWait.toFixed(1)} minutes**, keeping satisfaction indices stable.`;
      }

      return `### 👥 Customer Experience Metrics\n\n* **Queue Length**: **${qLen} students** ${qLen > 5 ? '⚠' : '✅'}\n* **Average Wait Time**: **${avgWait.toFixed(1)} mins**\n* **Manager Satisfaction Index**: **${sat}%** (${sat > 80 ? 'Excellent' : sat > 65 ? 'Stable' : 'Critical - Check operations'})\n* **Store Reputation Score**: **${rep}/100**${breakdown}`;
    }

    // --- Intent 7: Machine / Maintenance ---
    if (p.includes('machine') || p.includes('espresso') || p.includes('equipment') || p.includes('maintenance') || p.includes('calibrat') || p.includes('broken')) {
      const health = state.machineHealth;
      let recommendationBlock = '';

      if (health < 75) {
        this._pendingRecommendation = {
          action: 'calibrate_machines',
          title: 'Calibrate Espresso Boiler Pressure',
          confidencePct: 88,
          observation: `Boiler group temperature fluctuations detected. Machine health at ${health}%.`,
          reasoning: 'Calibrating steam valves and descaling groupheads restores extraction temperature consistency, preventing flat taste profiles and delays.',
          assumptions: 'No active electrical brownouts.',
          cost: '$20.00',
          roi: '210% (recovers speed-of-prep gains)',
          benefit: 'Restores boiler health to 100%',
          timeToImpact: '15 simulated minutes'
        };
        recommendationBlock = `\n\n💡 **BrewMind Recommendation:**\nMachine health is degrading. I recommend calibrating the heating elements. Click **Apply** below to run maintenance immediately!`;
      } else {
        recommendationBlock = `\n\n✅ **Equipment Diagnostics:** Espresso boiler pressure, grouphead gaskets, and grind calibrations are operating at peak efficiency. No maintenance is required.`;
      }

      return `### 🔧 Equipment & Espresso Systems Diagnostics\n\n* **Espresso Machine Health**: **${health}%** ${health < 75 ? '🔴 Warning' : '🟢 Optimal'}\n* **Boiler Temperature**: Stable (195°F - 202°F)\n* **Grouphead Pressure**: 9.1 Bars (standard espresso extraction profile)${recommendationBlock}`;
    }

    // --- Intent 8: Weather / Recipe Forecast ---
    if (p.includes('weather') || p.includes('rain') || p.includes('sunny') || p.includes('temperature') || p.includes('forecast')) {
      const w = state.weather;
      let menuTip = '';
      if (w.condition === 'Rainy') {
        menuTip = `☔ **Rainy Day Operations:** Cold weather directs student traffic to hot drinks (+25% demand). Feature **Double Espressos** and **Chai Lattes** at the front register counter. Keep hot cups stocked!`;
      } else if (w.condition === 'Sunny') {
        menuTip = `☀ **Sunny Day Operations:** Temperature is hot (${w.temp}°C). Cold beverage demand is peaking. Upsell **Iced Lattes**, **Syrup Additions**, and **Nitro Cold Brew**. Check milk stock frequently!`;
      } else {
        menuTip = `🌤 **Standard Operations:** Mild weather. Demand is evenly balanced between cold brew and warm espresso selections.`;
      }

      return `### 🌦 Weather & Demand Projection\n\n* **Current Weather**: **${w.condition}**\n* **Sensor Temperature**: **${w.temp}°C**\n\n💡 **Menu Strategy:**\n${menuTip}`;
    }

    // --- Intent 9: Operations Optimization / Audit ---
    if (p.includes('optimize') || p.includes('suggest') || p.includes('recommend') || p.includes('improve') || p.includes('advice') || p.includes('what should')) {
      const issues = [];
      if (state.customers.queueLength > 5) issues.push(`Queue congestion (${state.customers.queueLength} waiting) — **Recommend: Hire temp barista Jordan/Taylor**`);
      if (state.machineHealth < 75) issues.push(`Boiler health at ${state.machineHealth}% — **Recommend: Run espresso pressure calibration**`);
      if (state.inventory.coffeeBeans.current / state.inventory.coffeeBeans.max < 0.4) issues.push(`Coffee beans low (${getInvPct(state.inventory.coffeeBeans)}%) — **Recommend: Restock beans**`);
      if (state.inventory.milk.current / state.inventory.milk.max < 0.4) issues.push(`Milk low (${getInvPct(state.inventory.milk)}%) — **Recommend: Restock milk**`);
      if (state.customerSatisfaction < 68) issues.push(`Satisfaction down (${state.customerSatisfaction}%) — **Recommend: Reduce queue wait times**`);
      
      const emma = state.staff.list.find(b => b.name === 'Emma');
      if (emma && emma.stress > 65) issues.push(`Emma's stress at ${emma.stress}% — **Recommend: Rotate her off high-volume registers**`);

      if (issues.length === 0) {
        return `### 📈 Operations Optimization Audit: Perfect!\n\nAll café metrics are green and balanced. \n- **Queue**: ${state.customers.queueLength} students (Clear)\n- **Satisfaction**: ${state.customerSatisfaction}% (Healthy)\n- **Beans**: ${getInvPct(state.inventory.coffeeBeans)}% (Good)\n- **Revenue**: $${state.revenue.toFixed(2)}\n\nKeep monitoring during class transition windows!`;
      }

      return `### 📈 Operations Optimization Audit: ${issues.length} Issues Found\n\nBased on live telemetry, here is your prioritized action checklist:\n\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}\n\n*Would you like me to generate recommendation cards to apply any of these solutions?*`;
    }

    // --- Intent 10: Help / Commands ---
    if (p.includes('help') || p === 'commands' || p === '?') {
      return `### 🛠 BrewMind AI Help Center\n\nI can help you audit, forecast, and optimize your campus cafe operations! Try asking me:\n\n* **Staff Performance** — *"How are my baristas doing?"* or *"barista stress"* \n* **Inventory Audits** — *"Check stock levels"* or *"should I restock?"*\n* **Financial Telemetry** — *"Show revenue"* or *"what are our margins?"*\n* **Customer Experience** — *"Queue status"* or *"why is satisfaction dropping?"*\n* **Equipment Diagnostics** — *"Espresso machine health"* or *"schedule calibration"* \n* **Weather Analysis** — *"Weather forecast"* or *"menu strategy"* \n* **General Optimization** — *"Optimize operations"* or *"what should I do next?"*\n\n**Voice commands support:** *"Run rain simulation"*, *"Prepare for lunch rush"*, *"Generate report"*`;
    }

    // --- Intent 11: Conversational Business Advisor Fallback (Semantic Match) ---
    if (p.includes('menu') || p.includes('drink') || p.includes('croissant') || p.includes('muffin') || p.includes('latte') || p.includes('espresso') || p.includes('specialty')) {
      return `### ☕ BrewMind Menu Strategy Advisory\n\nLet's analyze your menu structure. Currently, specialty espresso drinks (Iced Lattes, Macchiatos) represent your **highest-margin items (grossing over 80% margins)**.\n\n**Menu Optimization Recommendations:**\n1. **High-Stress Rushes**: Direct customers to standard drip coffee or double espresso. Emma can brew these at 1.25x speed with minimal quality loss.\n2. **Slow Hours (3 PM - 5 PM)**: Promote premium specialty drinks (Liam extraction). His 1.3x quality rating maximizes satisfaction and builds brand reputation.\n3. **Add-Ons**: Charge a $0.60 premium for oat milk and flavored syrups. The wholesale cost is less than $0.08 per serving, boosting net margin by 4-5% per transaction.`;
    }

    if (p.includes('marketing') || p.includes('grow') || p.includes('advertise') || p.includes('customer') || p.includes('loyal') || p.includes('discount')) {
      return `### 📢 BrewMind Local Marketing Advisory\n\nTo drive transaction volumes and increase customer retention at your campus cafe, let's implement local micro-campaigns:\n\n1. **Loyalty Stamp Cards**: Implement a "Buy 9, Get the 10th Free" stamp card program. This increases customer lifetime value (LTV) and establishes a daily habit.\n2. **Faculty Happy Hour**: Offer a 15% discount for faculty cardholders between 2:00 PM and 4:00 PM (our standard low-activity period). Direct Liam to prepare these orders to ensure premium quality.\n3. **Sunny Day Bundling**: Bundle iced drinks with bakery muffins for a $0.50 discount. This clears perishable muffins (which decay and discard automatically at 15% freshness) and increases average transaction size.`;
    }

    if (p.includes('campus') || p.includes('student') || p.includes('faculty') || p.includes('prof') || p.includes('class') || p.includes('exam')) {
      return `### 🎓 Campus Target Demographics Analysis\n\nYour store serves two distinct customer segments on campus:\n\n1. **The Time-Pressed Student**: High volume, extremely sensitive to wait times. During class breaks (10-minute windows), they want fast service. Speed is everything here—Emma is your main asset, and transaction speed trumps quality.\n2. **The Leisurely Faculty Guest**: High average ticket size, highly sensitive to beverage quality. They prefer dining in and appreciate complex flavor notes. Deploy Liam (0.75x speed, 1.3x quality modifier) to handle these orders to protect your store's reputation score.`;
    }

    // Default intelligent state summary
    const activeIssues = [];
    if (state.customers.queueLength > 5) activeIssues.push('Queue congestion');
    if (state.machineHealth < 75) activeIssues.push('Espresso machine wear');
    if (state.customerSatisfaction < 65) activeIssues.push('Low customer satisfaction');
    if (state.inventory.coffeeBeans.current / state.inventory.coffeeBeans.max < 0.4) activeIssues.push('Low coffee beans');

    if (activeIssues.length > 0) {
      return `### 💡 Operational Alert Summary\n\nI scanned the cafe's sensors in response to your query. While I don't have a direct answer for *"${prompt}"* in my local offline registry, I detected these critical operational items:\n\n${activeIssues.map(i => `- ⚠ **${i}**`).join('\n')}\n\nType *"optimize operations"* to see my detailed priority audit, or ask me something specific like *"check inventory"*!`;
    }

    return `### ☕ BrewMind AI Operations Assistant\n\nThanks for your question! I analyzed the cafe's current live state, and everything looks stable:\n\n* **Queue**: **${state.customers.queueLength} students** (Healthy) ✅\n* **Satisfaction**: **${state.customerSatisfaction}%** (Stable) ✅\n* **Revenue**: **$${state.revenue.toFixed(2)}** today\n* **Espresso System**: **${state.machineHealth}%** health ✅\n\n*How can I help you today? Try asking me about inventory stock levels, barista shift stress, or machine calibrations!*`;
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
